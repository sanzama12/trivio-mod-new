"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type MouseEvent, type ReactNode } from "react";
import {
  LuAlignCenter, LuAlignJustify, LuAlignLeft, LuAlignRight, LuBold, LuCaseLower, LuCaseUpper, LuEraser,
  LuItalic, LuLink, LuList, LuListOrdered, LuPaintBucket, LuRedo2, LuStrikethrough, LuTable2, LuType, LuUnderline, LuUndo2,
} from "react-icons/lu";
import { httpsLink } from "@/lib/news-content";
import { cn } from "@/lib/cn";
import { newsHtmlText, sanitizeNewsHtml } from "@/lib/news-html";

function ToolButton({ label, children, onRun }: { label: string; children: ReactNode; onRun: () => void }) {
  return (
    <button type="button" title={label} aria-label={label} onMouseDown={(event) => event.preventDefault()} onClick={onRun} className="flex size-8 shrink-0 items-center justify-center rounded-md text-slate-700 transition hover:bg-primary-100 hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-primary-500">
      {children}
    </button>
  );
}

interface Props {
  value: string;
  invalid?: boolean;
  disabled?: boolean;
  onChange: (html: string, text: string) => void;
}

export function RichNewsEditor({ value, invalid, disabled, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const lastValueRef = useRef("");
  const [tableSize, setTableSize] = useState("3x3");

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && value !== lastValueRef.current && editor.innerHTML !== value) editor.innerHTML = sanitizeNewsHtml(value);
  }, [value]);

  useEffect(() => {
    const remember=()=>{
      const selection=window.getSelection();
      if(selection?.rangeCount){const range=selection.getRangeAt(0);if(editorRef.current?.contains(range.commonAncestorContainer))selectionRef.current=range.cloneRange();}
    };
    document.addEventListener('selectionchange',remember);
    return ()=>document.removeEventListener('selectionchange',remember);
  },[]);

  const sync = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const html = editor.innerHTML === "<br>" ? "" : editor.innerHTML;
    lastValueRef.current = html;
    onChange(html, newsHtmlText(html));
  };

  const captureSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) selectionRef.current = range.cloneRange();
  };

  const restoreSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection) return;
    editor.focus();
    const range = selectionRef.current;
    selection.removeAllRanges();
    if (range && editor.contains(range.commonAncestorContainer)) selection.addRange(range);
    else {
      const end = document.createRange();
      end.selectNodeContents(editor);
      end.collapse(false);
      selection.addRange(end);
    }
  };

  const runCommand = (command: string, commandValue?: string) => {
    restoreSelection();
    if(disabled)return;
    if(command==='fontSize') {
      const selection=window.getSelection();
      if(selection?.isCollapsed) {
        const size=Number(commandValue);
        if(![10,12,14,16,18,20,24,28,32,36,48,64,72].includes(size))return;
        document.execCommand('insertHTML',false,`<span data-news-caret="true" style="font-size:${size}px">&#8203;</span>`);
        const marker=editorRef.current?.querySelector('[data-news-caret]');
        if(marker?.firstChild){
          marker.removeAttribute('data-news-caret');
          const range=document.createRange();range.setStart(marker.firstChild,1);range.collapse(true);
          selection.removeAllRanges();selection.addRange(range);
        }
        captureSelection();sync();return;
      }
      document.execCommand('fontSize',false,'7');
      editorRef.current?.querySelectorAll('font[size="7"]').forEach(node=>{
        const span=document.createElement('span');
        span.setAttribute('style',node.getAttribute('style')??'');
        const face=node.getAttribute('face');
        const color=node.getAttribute('color');
        if(face)span.style.fontFamily=face;
        if(color)span.style.color=color;
        span.style.fontSize=commandValue+'px';
        span.innerHTML=node.innerHTML;
        node.replaceWith(span);
      });
    } else document.execCommand(command, false, commandValue);
    captureSelection();
    sync();
  };

  const transformCase = (mode: "upper" | "lower") => {
    restoreSelection();
    const editor = editorRef.current;
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!editor || !range || range.collapsed || !editor.contains(range.commonAncestorContainer)) return;
    const content = mode === "upper" ? range.toString().toLocaleUpperCase("vi-VN") : range.toString().toLocaleLowerCase("vi-VN");
    document.execCommand("insertText", false, content);
    captureSelection();
    sync();
  };

  const insertTable = () => {
    const [rowCount, columnCount] = tableSize.split("x").map(Number);
    const rows = Array.from({ length: rowCount }, () => `<tr>${Array.from({ length: columnCount }, () => '<td style="border:1px solid #cbd5e1;padding:8px"><br></td>').join("")}</tr>`).join("");
    runCommand("insertHTML", `<table style="border-collapse:collapse;width:100%"><tbody>${rows}</tbody></table><p><br></p>`);
  };

  const insertLink = () => {
    const url = window.prompt("Nhập liên kết https:// hoặc mailto:", "https://");
    if (!url || !/^(?:https?:\/\/|mailto:)/i.test(url.trim())) return;
    restoreSelection();
    const selection = window.getSelection();
    if (selection && selection.toString()) document.execCommand("createLink", false, url.trim());
    else document.execCommand("insertHTML", false, `<a href="${url.trim().replace(/["<>]/g, "")}">${url.trim().replace(/[<>&]/g, "")}</a>`);
    captureSelection();
    sync();
  };

  const insertImage = () => {
    const raw=window.prompt('Đường dẫn ảnh HTTPS:','https://');
    if(!raw)return;
    const url=httpsLink(raw);
    if(!url){window.alert('Đường dẫn ảnh HTTPS không hợp lệ.');return;}
    const alt=window.prompt('Mô tả ảnh (dành cho người đọc):','')??'';
    const image=document.createElement('img');image.src=url;image.alt=alt;image.style.width='100%';
    runCommand('insertHTML',sanitizeNewsHtml(image.outerHTML)+'<p><br></p>');
  };
  const lineSpacing=(value:string)=>{
    restoreSelection();
    const node=window.getSelection()?.anchorNode;
    const el=node instanceof Element?node:node?.parentElement;
    const block=el?.closest('p,div,h1,h2,h3,li,blockquote') as HTMLElement|null;
    if(block&&block!==editorRef.current&&editorRef.current?.contains(block)) {block.style.lineHeight=value;sync();}
    else {runCommand('formatBlock','p');const current=window.getSelection()?.anchorNode;const parent=current instanceof Element?current:current?.parentElement;const p=parent?.closest('p');if(p){p.style.lineHeight=value;sync();}}
  };
  const removeTable = () => {
    restoreSelection();
    const node=window.getSelection()?.anchorNode;
    const el=node instanceof Element?node:node?.parentElement;
    const table=el?.closest('table');
    if(table&&editorRef.current?.contains(table)){table.remove();selectionRef.current=null;sync();}
  };
  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const html = event.clipboardData.getData("text/html");
    if (!html) { event.preventDefault();runCommand("insertText",event.clipboardData.getData("text/plain"));return; }
    event.preventDefault();
    runCommand("insertHTML", sanitizeNewsHtml(html));
  };

  const rememberBeforeSelect = (event: MouseEvent<HTMLSelectElement>) => {
    event.stopPropagation();
    captureSelection();
  };

  return (
    <div className={cn("mt-1.5 overflow-hidden rounded-xl border bg-white", invalid ? "border-danger-500" : "border-slate-300 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100")}>
      <fieldset disabled={disabled} className="flex max-w-full flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-1.5" role="toolbar" aria-label="Định dạng nội dung bài viết">
        <span className="flex items-center gap-1 border-r border-slate-200 pr-1.5">
          <LuType className="ml-1 size-4 text-slate-400" aria-hidden />
          <select title="Kiểu đoạn" aria-label="Kiểu đoạn" defaultValue="p" onMouseDown={rememberBeforeSelect} onChange={(event) => runCommand("formatBlock", event.target.value)} className="h-8 w-24 rounded-md border-0 bg-transparent px-1 text-xs text-slate-700 focus:ring-2 focus:ring-primary-200">
            <option value="p">Văn bản</option><option value="h1">Tiêu đề 1</option><option value="h2">Tiêu đề 2</option><option value="h3">Tiêu đề 3</option><option value="blockquote">Trích dẫn</option>
          </select>
          <select title="Phông chữ" aria-label="Phông chữ" defaultValue="Arial" onMouseDown={rememberBeforeSelect} onChange={(event) => runCommand("fontName", event.target.value)} className="h-8 w-32 rounded-md border-0 bg-transparent px-1 text-xs text-slate-700 focus:ring-2 focus:ring-primary-200">
            <option>Arial</option><option>Calibri</option><option>Times New Roman</option><option>Roboto</option><option>Tahoma</option><option>Verdana</option><option>Georgia</option>
          </select>
          <select title="Cỡ chữ" aria-label="Cỡ chữ" defaultValue="16" onMouseDown={rememberBeforeSelect} onChange={(event) => runCommand("fontSize", event.target.value)} className="h-8 w-16 rounded-md border-0 bg-transparent px-1 text-xs text-slate-700 focus:ring-2 focus:ring-primary-200">
            {[10,12,14,16,18,20,24,28,32,36,48,64,72].map(size=><option key={size} value={size}>{size} px</option>)}
          </select>
        </span>
        <span className="flex items-center gap-0.5 border-r border-slate-200 px-1">
          <ToolButton label="Chữ đậm" onRun={() => runCommand("bold")}><LuBold className="size-4" /></ToolButton>
          <ToolButton label="Chữ nghiêng" onRun={() => runCommand("italic")}><LuItalic className="size-4" /></ToolButton>
          <ToolButton label="Gạch chân" onRun={() => runCommand("underline")}><LuUnderline className="size-4" /></ToolButton>
          <ToolButton label="Gạch ngang" onRun={() => runCommand("strikeThrough")}><LuStrikethrough className="size-4" /></ToolButton>
          <ToolButton label="CHỮ HOA" onRun={() => transformCase("upper")}><LuCaseUpper className="size-4" /></ToolButton>
          <ToolButton label="chữ thường" onRun={() => transformCase("lower")}><LuCaseLower className="size-4" /></ToolButton>
        </span>
        <span className="flex items-center gap-1 border-r border-slate-200 px-1.5">
          <label className="relative flex size-8 cursor-pointer items-center justify-center rounded-md text-slate-700 hover:bg-primary-100" title="Màu chữ"><LuType className="size-4" /><input type="color" defaultValue="#0f172a" aria-label="Màu chữ" className="absolute inset-0 cursor-pointer opacity-0" onMouseDown={captureSelection} onChange={(event) => runCommand("foreColor", event.target.value)} /></label>
          <label className="relative flex size-8 cursor-pointer items-center justify-center rounded-md text-slate-700 hover:bg-primary-100" title="Màu nền chữ"><LuPaintBucket className="size-4" /><input type="color" defaultValue="#fef3c7" aria-label="Màu nền chữ" className="absolute inset-0 cursor-pointer opacity-0" onMouseDown={captureSelection} onChange={(event) => runCommand("hiliteColor", event.target.value)} /></label>
        </span>
        <span className="flex items-center gap-0.5 border-r border-slate-200 px-1">
          <ToolButton label="Căn trái" onRun={() => runCommand("justifyLeft")}><LuAlignLeft className="size-4" /></ToolButton>
          <ToolButton label="Căn giữa" onRun={() => runCommand("justifyCenter")}><LuAlignCenter className="size-4" /></ToolButton>
          <ToolButton label="Căn phải" onRun={() => runCommand("justifyRight")}><LuAlignRight className="size-4" /></ToolButton>
          <ToolButton label="Căn đều" onRun={() => runCommand("justifyFull")}><LuAlignJustify className="size-4" /></ToolButton>
        </span>
        <span className="flex items-center gap-0.5 border-r border-slate-200 px-1">
          <ToolButton label="Danh sách chấm" onRun={() => runCommand("insertUnorderedList")}><LuList className="size-4" /></ToolButton>
          <ToolButton label="Danh sách số" onRun={() => runCommand("insertOrderedList")}><LuListOrdered className="size-4" /></ToolButton>
          <ToolButton label="Tăng thụt lề" onRun={()=>runCommand('indent')}>→</ToolButton>
          <ToolButton label="Giảm thụt lề" onRun={()=>runCommand('outdent')}>←</ToolButton>
          <select aria-label="Giãn dòng" title="Giãn dòng" defaultValue="1.75" onMouseDown={rememberBeforeSelect} onChange={event=>lineSpacing(event.target.value)} className="h-8 rounded border border-slate-200 px-1 text-xs">
            <option value="1">Dòng 1</option><option value="1.25">Dòng 1.25</option><option value="1.5">Dòng 1.5</option><option value="1.75">Dòng 1.75</option><option value="2">Dòng 2</option>
          </select>
          <ToolButton label="Chèn liên kết" onRun={insertLink}><LuLink className="size-4" /></ToolButton>
          <ToolButton label="Bỏ liên kết" onRun={()=>runCommand('unlink')}>↛</ToolButton>
          <ToolButton label="Chèn ảnh" onRun={insertImage}>Ảnh</ToolButton>
          <ToolButton label="Đường phân cách" onRun={()=>runCommand('insertHorizontalRule')}>―</ToolButton>
          <ToolButton label="Chỉ số trên" onRun={()=>runCommand('superscript')}>x²</ToolButton>
          <ToolButton label="Chỉ số dưới" onRun={()=>runCommand('subscript')}>x₂</ToolButton>
        </span>
        <span className="flex items-center gap-1 border-r border-slate-200 px-1.5">
          <select title="Kích thước bảng" aria-label="Kích thước bảng" value={tableSize} onMouseDown={rememberBeforeSelect} onChange={(event) => setTableSize(event.target.value)} className="h-8 w-16 rounded-md border-0 bg-transparent px-1 text-xs text-slate-700 focus:ring-2 focus:ring-primary-200">
            <option>2x2</option><option>3x3</option><option>4x4</option><option>5x5</option>
          </select>
          <ToolButton label={`Chèn bảng ${tableSize}`} onRun={insertTable}><LuTable2 className="size-4" /></ToolButton>
          <ToolButton label="Xóa bảng tại con trỏ" onRun={removeTable}>×</ToolButton>
        </span>
        <span className="flex items-center gap-0.5 px-1">
          <ToolButton label="Hoàn tác" onRun={() => runCommand("undo")}><LuUndo2 className="size-4" /></ToolButton>
          <ToolButton label="Làm lại" onRun={() => runCommand("redo")}><LuRedo2 className="size-4" /></ToolButton>
          <ToolButton label="Xóa định dạng" onRun={() => runCommand("removeFormat")}><LuEraser className="size-4" /></ToolButton>
        </span>
      </fieldset>
      <div
        id="news-body"
        ref={editorRef}
        className="email-rich-editor news-rich-content min-h-96 max-h-[70vh] overflow-auto px-4 py-3 text-base leading-relaxed text-slate-800 outline-none"
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder="Viết nội dung bài viết tại đây…"
        role="textbox"
        aria-multiline="true"
        aria-label="Nội dung bài viết"
        onInput={sync}
        onBlur={captureSelection}
        onKeyUp={captureSelection}
        onMouseUp={captureSelection}
        onPaste={handlePaste}
        onDrop={event=>event.preventDefault()}
      />
    </div>
  );
}
