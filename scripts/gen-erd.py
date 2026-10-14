"""Sinh ERD (Graphviz) + DBML từ lược đồ PostgreSQL thật đã nạp schema.sql — đảm bảo ERD khớp 100% SQL."""
import json, subprocess, os, html, re

OUT = os.environ.get("OUT", "out")
os.makedirs(OUT, exist_ok=True)

Q = r"""
SELECT json_build_object(
 'cols', (SELECT json_agg(json_build_object('t',c.table_name,'c',c.column_name,'type',
            CASE WHEN c.data_type='USER-DEFINED' THEN c.udt_name
                 WHEN c.data_type='character varying' THEN 'varchar'||coalesce('('||c.character_maximum_length||')','')
                 WHEN c.data_type='character' THEN 'char('||c.character_maximum_length||')'
                 WHEN c.data_type='numeric' THEN 'numeric('||c.numeric_precision||','||c.numeric_scale||')'
                 WHEN c.data_type='timestamp with time zone' THEN 'timestamptz'
                 ELSE c.data_type END,
            'null',c.is_nullable='YES','pos',c.ordinal_position,'gen',c.is_generated='ALWAYS' OR c.is_identity='YES') ORDER BY c.table_name,c.ordinal_position)
          FROM information_schema.columns c JOIN information_schema.tables t ON t.table_schema=c.table_schema AND t.table_name=c.table_name
          WHERE c.table_schema='trovio' AND t.table_type='BASE TABLE'),
 'pks', (SELECT json_agg(json_build_object('t',tc.table_name,'c',k.column_name))
          FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage k USING (constraint_schema,constraint_name)
          WHERE tc.table_schema='trovio' AND tc.constraint_type='PRIMARY KEY'),
 'uqs', (SELECT json_agg(json_build_object('t',tc.table_name,'n',tc.constraint_name,'c',k.column_name))
          FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage k USING (constraint_schema,constraint_name)
          WHERE tc.table_schema='trovio' AND tc.constraint_type='UNIQUE'),
 'fks', (SELECT json_agg(json_build_object('t',cl.relname,'n',con.conname,'cols',(SELECT json_agg(a.attname ORDER BY x.ord) FROM unnest(con.conkey) WITH ORDINALITY x(k,ord) JOIN pg_attribute a ON a.attrelid=con.conrelid AND a.attnum=x.k),
            'rt',rcl.relname,'rcols',(SELECT json_agg(a.attname ORDER BY x.ord) FROM unnest(con.confkey) WITH ORDINALITY x(k,ord) JOIN pg_attribute a ON a.attrelid=con.confrelid AND a.attnum=x.k)))
          FROM pg_constraint con JOIN pg_class cl ON cl.oid=con.conrelid JOIN pg_class rcl ON rcl.oid=con.confrelid JOIN pg_namespace n ON n.oid=cl.relnamespace
          WHERE n.nspname='trovio' AND con.contype='f')
)"""
raw = subprocess.check_output(["su", "postgres", "-c", f'psql -h /tmp -p 5544 -d trovio -At -c "{Q.replace(chr(34), chr(92)+chr(34))}"'], text=True)
d = json.loads(raw)

tables = {}
for c in d["cols"]:
    tables.setdefault(c["t"], []).append(c)
pk = {}
for p in d["pks"]:
    pk.setdefault(p["t"], set()).add(p["c"])
uq_single = set()
uq_groups = {}
for u in d["uqs"] or []:
    uq_groups.setdefault((u["t"], u["n"]), []).append(u["c"])
for (t, n), cols in uq_groups.items():
    if len(cols) == 1:
        uq_single.add((t, cols[0]))
fks = d["fks"]
fkcols = {}
for f in fks:
    for c in f["cols"]:
        fkcols.setdefault(f["t"], set()).add(c)

# ---------------- Nhóm module + tên tiếng Việt ----------------
MODULES = [
    ("M1", "Danh mục tham chiếu", "#F1F5F9", "#475569", ["regions", "priority_regions", "priority_groups", "admission_methods", "subjects", "combos", "combo_subjects", "riasec_types", "work_axes", "system_roles"]),
    ("M2", "Tuyển sinh: trường · ngành · chương trình", "#FCE7F3", "#9D174D", ["major_groups", "schools", "school_campuses", "majors", "major_riasec", "major_curriculum_blocks", "major_curriculum_items", "major_careers", "programs", "program_combos", "program_admission_methods", "program_cutoffs", "program_verified_fields"]),
    ("M3", "Tài khoản & phân quyền", "#DBEAFE", "#1E40AF", ["users", "user_system_roles", "school_staff", "user_sessions"]),
    ("M4", "Dữ liệu cá nhân của học sinh", "#FEF9C3", "#854D0E", ["score_profiles", "score_profile_subjects", "score_profile_regions", "score_profile_school_types", "score_profile_major_groups", "saved_programs", "wishlist_items", "quiz_results", "quiz_result_scores", "goals", "goal_regions", "work_styles", "mbti_codes"]),
    ("M5", "Trắc nghiệm RIASEC & phong cách làm việc", "#DCFCE7", "#166534", ["riasec_questions", "riasec_type_weights", "work_style_questions", "major_group_work_styles", "major_work_styles"]),
    ("M6", "Cấu hình gợi ý", "#EDE9FE", "#5B21B6", ["recommend_weights", "recommend_rules", "recommend_rule_params"]),
    ("M7", "Việc làm & nguồn dữ liệu", "#FFEDD5", "#9A3412", ["data_sources", "major_outcomes", "school_outcomes", "benchmarks"]),
    ("M8", "Mốc tuyển sinh & nhắc hạn", "#CCFBF1", "#115E59", ["timeline_config", "timeline_events", "deadline_reminders", "reminder_log"]),
    ("M9", "Cộng đồng: cảm nhận · hỏi đáp · khảo sát", "#FFE4E6", "#9F1239", ["school_reviews", "review_flags", "review_helpful_votes", "review_reports", "qa_questions", "qa_answers", "qa_answer_helpful_votes", "qa_answer_reports", "outcome_surveys"]),
    ("M10", "Chia sẻ phụ huynh & lớp giáo viên", "#E0E7FF", "#3730A3", ["shares", "share_comments", "teacher_classes", "class_members"]),
    ("M11", "Vận hành & quản trị", "#E2E8F0", "#334155", ["data_reports", "notifications", "audit_logs", "audit_changes", "import_batches", "school_submissions", "chat_aliases", "chat_logs", "analytics_events", "sus_responses"]),
]
VI = {
 "regions": "Miền", "priority_regions": "Khu vực ưu tiên", "priority_groups": "Đối tượng ưu tiên", "admission_methods": "Phương thức xét tuyển",
 "subjects": "Môn học", "combos": "Tổ hợp", "combo_subjects": "Môn của tổ hợp", "riasec_types": "Nhóm RIASEC", "work_axes": "Trục phong cách",
 "system_roles": "Vai trò hệ thống", "major_groups": "Nhóm ngành", "schools": "Trường", "school_campuses": "Cơ sở đào tạo", "majors": "Ngành",
 "major_riasec": "Mã Holland của ngành", "major_curriculum_blocks": "Khối chương trình học", "major_curriculum_items": "Học phần", "major_careers": "Vị trí việc làm",
 "programs": "Chương trình đào tạo", "program_combos": "Tổ hợp xét tuyển", "program_admission_methods": "Phương thức của chương trình",
 "program_cutoffs": "Điểm chuẩn", "program_verified_fields": "Số liệu trường xác nhận", "users": "Người dùng", "user_system_roles": "Phân quyền",
 "school_staff": "Cán bộ tuyển sinh", "user_sessions": "Phiên đăng nhập", "score_profiles": "Hồ sơ điểm", "score_profile_subjects": "Điểm từng môn",
 "score_profile_regions": "Miền mong muốn", "score_profile_school_types": "Loại trường mong muốn", "score_profile_major_groups": "Nhóm ngành quan tâm",
 "saved_programs": "Chương trình đã lưu", "wishlist_items": "Nguyện vọng", "quiz_results": "Kết quả RIASEC", "quiz_result_scores": "Điểm từng nhóm RIASEC",
 "goals": "Mục tiêu", "goal_regions": "Miền của mục tiêu", "work_styles": "Phong cách làm việc", "mbti_codes": "Mã MBTI tự nhập",
 "riasec_questions": "Câu hỏi RIASEC", "riasec_type_weights": "Trọng số nhóm RIASEC", "work_style_questions": "Câu hỏi mini-test",
 "major_group_work_styles": "Phong cách theo nhóm ngành", "major_work_styles": "Phong cách theo ngành", "recommend_weights": "Trọng số gợi ý",
 "recommend_rules": "Quy tắc gợi ý", "recommend_rule_params": "Tham số quy tắc", "data_sources": "Nguồn dữ liệu", "major_outcomes": "Việc làm theo ngành",
 "school_outcomes": "Việc làm theo trường", "benchmarks": "Mốc so sánh", "timeline_config": "Mùa tuyển sinh", "timeline_events": "Mốc tuyển sinh",
 "deadline_reminders": "Nhắc hạn", "reminder_log": "Nhật ký gửi nhắc", "school_reviews": "Cảm nhận sinh viên", "review_flags": "Cờ kiểm duyệt",
 "review_helpful_votes": "Lượt hữu ích", "review_reports": "Báo cáo cảm nhận", "qa_questions": "Câu hỏi hỏi đáp", "qa_answers": "Câu trả lời",
 "qa_answer_helpful_votes": "Lượt hữu ích (trả lời)", "qa_answer_reports": "Báo cáo trả lời", "outcome_surveys": "Khảo sát sau 1 năm",
 "shares": "Link chia sẻ phụ huynh", "share_comments": "Góp ý phụ huynh", "teacher_classes": "Lớp của giáo viên", "class_members": "Học sinh trong lớp",
 "data_reports": "Báo lỗi dữ liệu", "notifications": "Thông báo", "audit_logs": "Nhật ký thay đổi", "audit_changes": "Chi tiết thay đổi",
 "import_batches": "Lô nhập dữ liệu", "school_submissions": "Bản sửa của trường", "chat_aliases": "Từ khoá chatbot", "chat_logs": "Câu hỏi chatbot",
 "analytics_events": "Sự kiện thống kê ẩn danh", "sus_responses": "Khảo sát SUS",
}
mod_of = {t: m for m in MODULES for t in m[4]}
missing = set(tables) - set(mod_of)
assert not missing, missing
assert set(VI) >= set(tables), set(tables) - set(VI)

def card(fk):
    """Bội số phía con: 1 nếu cột FK là PK đầy đủ hoặc unique → 1:1, ngược lại 1:N."""
    cols = set(fk["cols"])
    if pk.get(fk["t"]) == cols or (len(cols) == 1 and (fk["t"], next(iter(cols))) in uq_single):
        return "1:1"
    return "1:N"

def optional(fk):
    cmap = {c["c"]: c for c in tables[fk["t"]]}
    return any(cmap[c]["null"] for c in fk["cols"])

FONT = "DejaVu Sans"

def table_label(t, full=True, ghost=False):
    m = mod_of[t]
    head_bg, head_fg = (m[2], m[3]) if not ghost else ("#F8FAFC", "#94A3B8")
    rows = [f'<TR><TD BGCOLOR="{head_bg}" COLSPAN="3" CELLPADDING="5"><FONT POINT-SIZE="13" COLOR="{head_fg}"><B>{t}</B></FONT><BR/><FONT POINT-SIZE="10" COLOR="{head_fg}">{html.escape(VI[t])}</FONT></TD></TR>']
    for c in tables[t]:
        is_pk = c["c"] in pk.get(t, set())
        is_fk = c["c"] in fkcols.get(t, set())
        if not full and not (is_pk or is_fk):
            continue
        if ghost and not is_pk:
            continue
        key = ("PK" if is_pk else "") + (" FK" if is_fk else "")
        key = key.strip()
        kcol = "#B45309" if is_pk else "#2563EB"
        name = f"<B>{c['c']}</B>" if is_pk else c["c"]
        if (t, c["c"]) in uq_single and not is_pk:
            key = (key + " UQ").strip()
        typ = c["type"] + ("" if c["null"] else " NN")
        rows.append(f'<TR><TD ALIGN="LEFT" PORT="{c["c"]}_w">{f'<FONT POINT-SIZE="9" COLOR="{kcol}"><B>{key}</B></FONT>' if key else ' '}</TD><TD ALIGN="LEFT"><FONT POINT-SIZE="10.5">{name}</FONT></TD><TD ALIGN="LEFT" PORT="{c["c"]}_e"><FONT POINT-SIZE="9" COLOR="#64748B">{html.escape(typ)}</FONT></TD></TR>')
    if not full and not ghost:
        extra = sum(1 for c in tables[t] if c["c"] not in pk.get(t, set()) and c["c"] not in fkcols.get(t, set()))
        if extra:
            rows.append(f'<TR><TD COLSPAN="3" ALIGN="LEFT"><FONT POINT-SIZE="9" COLOR="#94A3B8">+ {extra} cột khác</FONT></TD></TR>')
    border = "#CBD5E1" if ghost else "#64748B"
    style = ' STYLE="dashed"' if ghost else ""
    return f'<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="3" COLOR="{border}" BGCOLOR="white"{style}>' + "".join(rows) + "</TABLE>>"

def edge(fk, show_label=True):
    k = card(fk)
    opt = optional(fk)
    # Vẽ từ bảng CHA → bảng CON: đầu mũi tên ở con = chân chim (N) hoặc gạch (1); đuôi ở cha = || (bắt buộc) hoặc o| (tuỳ chọn)
    tail = "teeodot" if opt else "teetee"
    head = "crowodot" if k == "1:N" else "teeodot"
    style = ' style="dashed",' if opt else ""
    return f'"{fk["rt"]}":"{fk["rcols"][0]}_e":e -> "{fk["t"]}":"{fk["cols"][0]}_w":w [dir=both, arrowtail={tail}, arrowhead={head},{style} color="#64748B"];'

def render(name, title, nodes, ghosts, full, layout="dot", rankdir="LR", extra=""):
    lines = [f'digraph "{name}" {{', f'graph [fontname="{FONT}", rankdir={rankdir}, splines=spline, nodesep=0.35, ranksep=1.1, pad=0.4, labelloc=t, fontsize=24, label=<<B>{html.escape(title)}</B><BR/><FONT POINT-SIZE="12" COLOR="#64748B">Trovio · PostgreSQL · sinh tự động từ database/schema.sql · PK khoá chính · FK khoá ngoại · UQ duy nhất · NN bắt buộc</FONT><BR/><FONT POINT-SIZE="12" COLOR="#64748B">Quan hệ (ký hiệu chân chim): ‖ phía cha = bắt buộc · ○ + nét đứt = tuỳ chọn (FK cho phép NULL) · chân chim phía con = nhiều (1:N) · gạch phía con = một (1:1) · bảng viền đứt = thuộc nhóm khác</FONT>>, bgcolor="white"{extra}];',
             f'node [shape=plaintext, fontname="{FONT}"]; edge [fontname="{FONT}", arrowsize=0.8];']
    if layout == "clusters":
        for mid, mname, bg, fg, ts in MODULES:
            inn = [t for t in ts if t in nodes]
            if not inn: continue
            lines.append(f'subgraph "cluster_{mid}" {{ label=<<B>{mid}. {html.escape(mname)}</B>>; fontsize=18; fontcolor="{fg}"; style="rounded,filled"; fillcolor="{bg}55"; color="{fg}"; penwidth=1.5;')
            for t in inn:
                lines.append(f'"{t}" [label={table_label(t, full)}];')
            lines.append("}")
    else:
        for t in nodes:
            lines.append(f'"{t}" [label={table_label(t, full)}];')
    for t in ghosts:
        lines.append(f'"{t}" [label={table_label(t, False, True)}];')
    shown = set(nodes) | set(ghosts)
    for f in fks:
        if f["t"] in shown and f["rt"] in shown and (f["t"] in nodes or f["rt"] in nodes):
            lines.append(edge(f, show_label=(layout != "clusters")))
    lines.append("}")
    dotf = f"{OUT}/{name}.dot"
    open(dotf, "w").write("\n".join(lines))
    for fmt in ("svg", "png"):
        args = ["dot", f"-T{fmt}", dotf, "-o", f"{OUT}/{name}.{fmt}"]
        if fmt == "png": args.insert(1, "-Gdpi=110")
        subprocess.check_call(args)

# 1) Tổng thể: tất cả bảng, chỉ cột khoá, nhóm theo module
render("00-erd-tong-the", "ERD tổng thể – Hệ thống Trovio (79 bảng, 11 nhóm)", list(tables), [], full=False, layout="clusters", rankdir="LR")

# 2) Chi tiết từng module (đủ cột) + bảng liên quan ở module khác vẽ mờ
for i, (mid, mname, bg, fg, ts) in enumerate(MODULES, 1):
    nodes = [t for t in ts if t in tables]
    rel = set()
    for f in fks:
        if f["t"] in nodes and f["rt"] not in nodes: rel.add(f["rt"])
        if f["rt"] in nodes and f["t"] not in nodes and mid in ("M1",): pass  # M1 được tham chiếu khắp nơi: không vẽ ngược
        elif f["rt"] in nodes and f["t"] not in nodes and mid in ("M2", "M3"): pass  # tránh rối: chỉ vẽ phụ thuộc đi ra
        elif f["rt"] in nodes and f["t"] not in nodes: rel.add(f["t"])
    render(f"{i:02d}-{mid.lower()}", f"{mid}. {mname}", nodes, sorted(rel), full=True, rankdir="LR")

# 3) ERD lõi nghiệp vụ (dùng cho báo cáo): tuyển sinh + học sinh + RIASEC, đủ cột
core = ["regions", "priority_regions", "priority_groups", "admission_methods", "subjects", "combos", "combo_subjects", "riasec_types",
        "major_groups", "schools", "majors", "major_riasec", "programs", "program_combos", "program_admission_methods", "program_cutoffs",
        "users", "score_profiles", "score_profile_subjects", "saved_programs", "wishlist_items", "quiz_results", "quiz_result_scores", "goals",
        "riasec_questions", "riasec_type_weights", "recommend_weights", "work_styles", "mbti_codes"]
render("12-erd-loi-nghiep-vu", "ERD lõi nghiệp vụ – tuyển sinh, hồ sơ học sinh, trắc nghiệm & gợi ý", core, [], full=True, rankdir="LR")

# 4) DBML để mở / chỉnh trên dbdiagram.io
TYPE_MAP = {"text": "text", "boolean": "boolean", "integer": "int", "smallint": "smallint", "bigint": "bigint", "date": "date", "timestamptz": "timestamptz"}
dbml = ["// Trovio – sinh tự động từ database/schema.sql. Dán vào https://dbdiagram.io để xem / chỉnh.", 'Project trovio { database_type: "PostgreSQL" }', ""]
for mid, mname, bg, fg, ts in MODULES:
    dbml.append(f'TableGroup "{mid} {mname}" {{\n' + "\n".join(f"  {t}" for t in ts) + "\n}\n")
for t in sorted(tables):
    dbml.append(f'Table {t} [note: "{VI[t]}"] {{')
    pkc = pk.get(t, set())
    for c in tables[t]:
        ty = c["type"].replace(" ", "_") if " " in c["type"] else c["type"]
        if not re.match(r"^[a-z_]+(\(\d+(,\d+)?\))?$", ty): ty = f'"{ty}"'
        attrs = []
        if c["c"] in pkc and len(pkc) == 1: attrs.append("pk")
        if not c["null"]: attrs.append("not null")
        if (t, c["c"]) in uq_single: attrs.append("unique")
        if c["gen"]: attrs.append("note: 'tự sinh'")
        dbml.append(f'  {c["c"]} {ty}' + (f' [{", ".join(attrs)}]' if attrs else ""))
    if len(pkc) > 1:
        dbml.append("  indexes {\n    (" + ", ".join(c["c"] for c in tables[t] if c["c"] in pkc) + ") [pk]\n  }")
    dbml.append("}\n")
for f in fks:
    rel = "-" if card(f) == "1:1" else ">"
    if len(f["cols"]) == 1:
        dbml.append(f'Ref: {f["t"]}.{f["cols"][0]} {rel} {f["rt"]}.{f["rcols"][0]}')
    else:
        dbml.append(f'Ref: {f["t"]}.({", ".join(f["cols"])}) {rel} {f["rt"]}.({", ".join(f["rcols"])})')
open(f"{OUT}/trovio.dbml", "w").write("\n".join(dbml) + "\n")

print(json.dumps({"tables": len(tables), "fks": len(fks), "one_to_one": sum(card(f) == "1:1" for f in fks)}))
