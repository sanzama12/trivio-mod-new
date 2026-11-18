import assert from 'node:assert/strict';
import test from 'node:test';
import { answerQuestion, chatbotService, maskQuestion } from '../../src/services/chatbot.service';
import { isFaithful } from '../../src/services/chatbot-llm';
import { cleanChatAnswer, cleanChatText, safeChatHref } from '../../src/domain/chat';
import { findExternalEvidence } from '../../src/services/external-evidence.service';
import { findMarkdownAnswer, parseMarkdownFaq } from '../../src/services/chatbot-markdown';
import { answerWithWusRouter, sendWusRouterChat } from '../../src/services/wusrouter-llm';
import { repositories } from '../repositories';

test('chatbot analytics log masks contact details', () => {
  const masked = maskQuestion('Liên hệ em qua test@example.com hoặc 0912345678');
  assert.equal(masked.includes('test@example.com'), false);
  assert.equal(masked.includes('0912345678'), false);
});

test('Markdown FAQ answers normalized navigation questions without querying the catalog', async () => {
  const original = repositories.majors.findAll;
  repositories.majors.findAll = async () => { throw new Error('Catalog should not load for FAQ'); };
  try {
    const answer = await answerQuestion('  XEM  danh sách ngành ở đâu?!\u200b');
    assert.equal(answer.intent, 'markdown-faq');
    assert.equal(answer.sources[0].href, '/nganh');
    assert.match(answer.text, /Khám phá ngành/);
    assert.equal(findMarkdownAnswer('Điểm chuẩn ngành Marketing năm 2025'), null);
  } finally {
    repositories.majors.findAll = original;
  }
});

test('Markdown FAQ rejects duplicate questions and unsafe source links', () => {
  assert.throws(() => parseMarkdownFaq('## A?\nSource: [X](/nganh)\n> Một câu.\n## A!\nSource: [X](/truong)\n> Câu khác.'), /Duplicate/);
  assert.throws(() => parseMarkdownFaq('## A?\nSource: [X](javascript:alert(1))\n> Một câu.'), /Invalid/);
});

test('chat text cleanup removes invisible and broken characters while retaining Vietnamese', () => {
  const text = cleanChatText('Điểm\u200b chuẩn\u202e 22,5\ufffd\r\nngành học');
  assert.equal(text, 'Điểm chuẩn 22,5\nngành học');
  const answer = cleanChatAnswer({ kind: 'answer', intent: 'test', text, items: [], sources: [], suggestions: ['Xem\u200b ngành'], context: {} });
  assert.equal(answer.suggestions[0], 'Xem ngành');
});

test('grounded AI cannot introduce new numbers or links', () => {
  const facts = 'Điểm chuẩn 2025 là 24,5.';
  assert.equal(isFaithful('Điểm chuẩn năm 2025 là 24,5.', facts), true);
  assert.equal(isFaithful('Điểm chuẩn dự kiến là 26.', facts), false);
  assert.equal(isFaithful('Xem tại https://example.com', facts), false);
});

test('chat source links accept real https article URLs and reject unsafe schemes', () => {
  assert.equal(safeChatHref('https://vi.wikipedia.org/wiki/K%E1%BB%B9_s%C6%B0?oldformat=true'), 'https://vi.wikipedia.org/wiki/K%E1%BB%B9_s%C6%B0?oldformat=true');
  assert.equal(safeChatHref('javascript:alert(1)'), null);
  assert.equal(safeChatHref('https://user:pass@example.com/path'), null);
});

test('outside evidence requires a relevant real article', async () => {
  const fetchMock = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('list=search')) return Response.json({ query: { search: [
      { pageid: 1, title: 'Địa lý' },
      { pageid: 2, title: 'Kỹ sư phần mềm' },
    ] } });
    return Response.json({ query: { pages: {
      2: { title: 'Kỹ sư phần mềm', extract: 'Kỹ sư phần mềm thiết kế, phát triển, kiểm thử và bảo trì phần mềm theo yêu cầu của người dùng. Công việc còn bao gồm phối hợp với các nhóm khác để triển khai sản phẩm.' },
    } } });
  }) as typeof fetch;
  const evidence = await findExternalEvidence('Kỹ sư phần mềm làm gì?', fetchMock);
  assert.equal(evidence?.sources.length, 1);
  assert.match(evidence?.sources[0].href ?? '', /^https:\/\/vi\.wikipedia\.org\/wiki\//);
  assert.match(evidence?.text ?? '', /thiết kế, phát triển/);
  assert.equal(await findExternalEvidence('Quy chế tuyển sinh năm nay?', fetchMock), null);
});

test('chat aliases are reused and refreshed after an admin deletion', async () => {
  const original = {
    majors: repositories.majors.findAll,
    schools: repositories.schools.findAll,
    programs: repositories.programs.findAll,
    aliases: repositories.chatAliases.list,
    delete: repositories.chatAliases.delete,
    audit: repositories.audit.append,
  };
  const alias = {
    id: '11111111-1111-4111-8111-111111111111', alias: 'test alias', label: 'Test alias',
    kind: 'major' as const, targetId: 'test-major', createdAt: new Date().toISOString(), createdBy: 'admin',
  };
  let aliases = [alias];
  let reads = 0;
  try {
    repositories.majors.findAll = async () => [];
    repositories.schools.findAll = async () => [];
    repositories.programs.findAll = async () => [];
    repositories.chatAliases.list = async () => { reads++; return aliases; };
    repositories.chatAliases.delete = async () => { aliases = []; return true; };
    repositories.audit.append = async () => {};
    await answerQuestion('xin chào');
    assert.equal(reads, 0);
    await answerQuestion('ngành không tồn tại là gì?');
    await answerQuestion('ngành không tồn tại là gì?');
    assert.equal(reads, 1);
    assert.equal(await chatbotService.deleteAlias({ id: 'admin', email: 'admin@example.com' } as Parameters<typeof chatbotService.deleteAlias>[0], alias.id), true);
    await answerQuestion('ngành không tồn tại là gì?');
    assert.equal(reads, 3);
  } finally {
    repositories.majors.findAll = original.majors;
    repositories.schools.findAll = original.schools;
    repositories.programs.findAll = original.programs;
    repositories.chatAliases.list = original.aliases;
    repositories.chatAliases.delete = original.delete;
    repositories.audit.append = original.audit;
  }
});

test('school questions about current staff and FPT Polytechnic bypass generic school details', async () => {
  const original = {
    majors: repositories.majors.findAll,
    schools: repositories.schools.findAll,
    programs: repositories.programs.findAll,
    aliases: repositories.chatAliases.list,
  };
  try {
    repositories.majors.findAll = async () => [];
    repositories.schools.findAll = async () => [{ id: 'fpt', name: 'Trường Đại học FPT', shortName: 'FPT', slug: 'dai-hoc-fpt' } as Awaited<ReturnType<typeof original.schools>>[number]];
    repositories.programs.findAll = async () => [];
    repositories.chatAliases.list = async () => [];
    assert.equal((await answerQuestion('FPT')).intent, 'school-info');
    assert.equal((await answerQuestion('Hiệu trưởng FPT?')).kind, 'unknown');
    const polytechnic = await answerQuestion('Hiện tại FPT Polytechnic do ai là hiệu trưởng?');
    assert.equal(polytechnic.kind, 'unknown');
    assert.equal(polytechnic.context.schoolId, undefined);
  } finally {
    repositories.majors.findAll = original.majors;
    repositories.schools.findAll = original.schools;
    repositories.programs.findAll = original.programs;
    repositories.chatAliases.list = original.aliases;
  }
});

test('chat log write and conversation lookup start together', async () => {
  const original = {
    add: repositories.chatLogs.add,
    find: repositories.chatHistory.findById,
    put: repositories.chatHistory.put,
  };
  let finishLog: (() => void) | undefined;
  let lookupStarted = false;
  try {
    repositories.chatLogs.add = () => new Promise<void>((resolve) => { finishLog = resolve; });
    repositories.chatHistory.findById = async () => { lookupStarted = true; return null; };
    repositories.chatHistory.put = async (c) => c;
    const pending = chatbotService.ask('xin chào', {}, { userId: 'test-user', conversationId: '11111111-1111-4111-8111-111111111111' });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(lookupStarted, true);
    finishLog?.();
    assert.equal((await pending).ok, true);
  } finally {
    finishLog?.();
    repositories.chatLogs.add = original.add;
    repositories.chatHistory.findById = original.find;
    repositories.chatHistory.put = original.put;
  }
});

test('model request is bounded and upstream text errors are not shown as answers', async () => {
  const previous = process.env.WUSROUTER_API_KEY;
  process.env.WUSROUTER_API_KEY = 'test-key';
  let maxTokens = 0;
  const fetchMock = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    maxTokens = JSON.parse(String(init?.body)).max_tokens;
    return Response.json({ choices: [{ message: { content: 'Upstream temporarily unavailable, please retry.' } }] });
  }) as typeof fetch;
  try {
    assert.equal(await sendWusRouterChat([{ role: 'user', content: 'test' }], {}, fetchMock), null);
    assert.equal(maxTokens, 240);
  } finally {
    if (previous === undefined) delete process.env.WUSROUTER_API_KEY;
    else process.env.WUSROUTER_API_KEY = previous;
  }
});

test('open question prompt asks for a concise sourced answer', async () => {
  const previous = process.env.WUSROUTER_API_KEY;
  process.env.WUSROUTER_API_KEY = 'test-key';
  let request: any = null;
  const fetchMock = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    request = JSON.parse(String(init?.body));
    return Response.json({ choices: [{ message: { content: 'Trả lời ngắn.' } }] });
  }) as typeof fetch;
  try {
    assert.equal(await answerWithWusRouter({ question: 'Kỹ sư phần mềm làm gì?', evidence: 'Tài liệu về nghề nghiệp' }, fetchMock), 'Trả lời ngắn.');
    assert.equal(request?.max_tokens, 300);
    assert.match(request!.messages[0].content, /2-4 câu ngắn/);
    assert.match(request!.messages[0].content, /Tài liệu về nghề nghiệp/);
  } finally {
    if (previous === undefined) delete process.env.WUSROUTER_API_KEY;
    else process.env.WUSROUTER_API_KEY = previous;
  }
});
