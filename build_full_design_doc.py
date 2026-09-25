import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

# Define Palette
COLOR_NAVY = RGBColor(27, 54, 93)      # #1B365D Primary
COLOR_SLATE = RGBColor(46, 91, 136)    # #2E5B88 Secondary
COLOR_CHARCOAL = RGBColor(44, 62, 80)  # #2C3E50 Body Text
COLOR_MUTED = RGBColor(127, 140, 141)  # #7F8C8D Subtitles / Footers
COLOR_WHITE = RGBColor(255, 255, 255)
HEX_NAVY = "1B365D"
HEX_SLATE = "2E5B88"
HEX_LIGHT_BG = "F4F7FA"
HEX_BORDER = "D1D5DB"
HEX_ALT_ROW = "F9FAFB"

def set_cell_background(cell, hex_color):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for margin_name, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{margin_name}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color=HEX_BORDER, sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:left w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'  <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def add_callout(doc, text, title="ARCHITECTURE NOTE"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, "EDF4FB")
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    # Left thick border
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'  <w:top w:val="none"/>'
        f'  <w:left w:val="single" w:sz="24" w:space="0" w:color="{HEX_NAVY}"/>'
        f'  <w:bottom w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    run_t = p.add_run(f"📌 {title}\n")
    run_t.font.name = 'Calibri'
    run_t.font.size = Pt(9.5)
    run_t.font.bold = True
    run_t.font.color.rgb = COLOR_NAVY
    
    run_b = p.add_run(text)
    run_b.font.name = 'Calibri'
    run_b.font.size = Pt(9)
    run_b.font.color.rgb = COLOR_CHARCOAL
    
    doc.add_paragraph().paragraph_format.space_after = Pt(6)

def format_heading(p, text, level=1):
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Calibri'
    run.font.bold = True
    
    if level == 1:
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(6)
        run.font.size = Pt(16)
        run.font.color.rgb = COLOR_NAVY
        # Bottom border under H1
        pPr = p._p.get_or_add_pPr()
        pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="12" w:space="4" w:color="{HEX_NAVY}"/></w:pBdr>')
        pPr.append(pBdr)
    elif level == 2:
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
        run.font.size = Pt(13)
        run.font.color.rgb = COLOR_SLATE
    elif level == 3:
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(2)
        run.font.size = Pt(11)
        run.font.color.rgb = COLOR_CHARCOAL

def add_body_p(doc, text, bold_prefix=""):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix + " ")
        r_pre.font.name = 'Calibri'
        r_pre.font.size = Pt(10)
        r_pre.font.bold = True
        r_pre.font.color.rgb = COLOR_NAVY
    r = p.add_run(text)
    r.font.name = 'Calibri'
    r.font.size = Pt(10)
    r.font.color.rgb = COLOR_CHARCOAL
    return p

def add_bullet_item(doc, title, text):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    r_title = p.add_run(title + ": ")
    r_title.font.name = 'Calibri'
    r_title.font.size = Pt(9.5)
    r_title.font.bold = True
    r_title.font.color.rgb = COLOR_NAVY
    r_text = p.add_run(text)
    r_text.font.name = 'Calibri'
    r_text.font.size = Pt(9.5)
    r_text.font.color.rgb = COLOR_CHARCOAL

def add_centered_image(doc, image_path, caption_text, width=Inches(6.2)):
    if not os.path.exists(image_path):
        p = doc.add_paragraph(f"[Image Missing: {image_path}]")
        p.runs[0].font.color.rgb = RGBColor(200, 0, 0)
        return
    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(8)
    p_img.paragraph_format.space_after = Pt(4)
    p_img.paragraph_format.keep_with_next = True
    run = p_img.add_run()
    run.add_picture(image_path, width=width)
    
    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(2)
    p_cap.paragraph_format.space_after = Pt(12)
    r_cap = p_cap.add_run(f"Figure: {caption_text}")
    r_cap.font.name = 'Calibri'
    r_cap.font.size = Pt(9)
    r_cap.font.italic = True
    r_cap.font.color.rgb = COLOR_MUTED

def style_header_cell(cell, text, width=None):
    if width:
        cell.width = width
    set_cell_background(cell, HEX_NAVY)
    set_cell_margins(cell, top=120, bottom=120, left=140, right=140)
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    run = p.add_run(text)
    run.font.name = 'Calibri'
    run.font.size = Pt(9)
    run.font.bold = True
    run.font.color.rgb = COLOR_WHITE

def style_body_cell(cell, text, width=None, is_alt=False, is_bold=False, align=WD_ALIGN_PARAGRAPH.LEFT):
    if width:
        cell.width = width
    if is_alt:
        set_cell_background(cell, HEX_ALT_ROW)
    set_cell_margins(cell, top=90, bottom=90, left=140, right=140)
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    run = p.add_run(str(text))
    run.font.name = 'Calibri'
    run.font.size = Pt(8.5)
    run.font.bold = is_bold
    run.font.color.rgb = COLOR_CHARCOAL

def create_table_from_data(doc, headers, data, col_widths=None):
    table = doc.add_table(rows=len(data) + 1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table)
    
    # Repeat header row across pages
    header_tr = table.rows[0]._tr.get_or_add_trPr()
    header_tr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
    
    for c_idx, h in enumerate(headers):
        w = col_widths[c_idx] if col_widths and c_idx < len(col_widths) else None
        style_header_cell(table.cell(0, c_idx), h, width=w)
        
    for r_idx, row_data in enumerate(data):
        is_alt = (r_idx % 2 == 1)
        for c_idx, val in enumerate(row_data):
            w = col_widths[c_idx] if col_widths and c_idx < len(col_widths) else None
            is_bold = (c_idx == 0)
            style_body_cell(table.cell(r_idx + 1, c_idx), val, width=w, is_alt=is_alt, is_bold=is_bold)
            
    doc.add_paragraph().paragraph_format.space_after = Pt(8)
    return table

def build_system_design_doc():
    doc = Document()
    
    # Page Margins (1 inch everywhere)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        
    # ==========================================================================
    # COVER / TITLE PAGE
    # ==========================================================================
    p_title_space = doc.add_paragraph()
    p_title_space.paragraph_format.space_before = Pt(40)
    
    p_school = doc.add_paragraph()
    p_school.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sch = p_school.add_run("BOLINAO SCHOOL OF FISHERIES")
    r_sch.font.name = 'Calibri'
    r_sch.font.size = Pt(14)
    r_sch.font.bold = True
    r_sch.font.color.rgb = COLOR_SLATE
    
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(6)
    p_title.paragraph_format.space_after = Pt(8)
    r_title = p_title.add_run("STUDENT E-VOTING SYSTEM\nSYSTEM DESIGN SPECIFICATION")
    r_title.font.name = 'Calibri'
    r_title.font.size = Pt(24)
    r_title.font.bold = True
    r_title.font.color.rgb = COLOR_NAVY
    
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(36)
    r_sub = p_sub.add_run("Comprehensive Architectural Design, Data Flow Diagrams, Entity Relationships, Flowcharts, and Schema Data Dictionary")
    r_sub.font.name = 'Calibri'
    r_sub.font.size = Pt(11)
    r_sub.font.italic = True
    r_sub.font.color.rgb = COLOR_CHARCOAL

    # Document Information Box
    meta_headers = ["Metadata Attribute", "Specification Details"]
    meta_data = [
        ["Project Title", "Bolinao School of Fisheries Student E-Voting Portal"],
        ["System Engineering Lead", "Golden West Colleges (GWC) Student Development Team"],
        ["Architecture Version", "Release 2.5.0 (Enterprise Online Scoped Multi-Precinct Architecture)"],
        ["Target Deployment", "Appwrite Cloud BaaS + Express/Node.js REST API + Vite Client"],
        ["Security Standard", "Scrypt Key Derivation + HMAC-SHA256 Tokens + Deterministic Composite Key Deduplication"],
        ["Document Classification", "Technical System Design & Architectural Blueprint"],
        ["Status / Verification", "Production Verified, DepEd SF1 Ready & Field Tested"]
    ]
    create_table_from_data(doc, meta_headers, meta_data, [Inches(2.2), Inches(4.3)])
    
    doc.add_page_break()
    
    # ==========================================================================
    # SECTION 1: EXECUTIVE SUMMARY & ARCHITECTURE OVERVIEW
    # ==========================================================================
    format_heading(doc.add_paragraph(), "1. Executive Summary & System Architecture", level=1)
    
    add_body_p(doc, 
        "The Bolinao School of Fisheries Student E-Voting System is an enterprise-grade, cloud-connected digital election portal "
        "engineered to conduct transparent, tamper-resistant, auditable, and highly accessible democratic elections across "
        "diverse administrative boundaries within an educational institution. The platform supports complex institutional elections "
        "spanning school-wide Supreme Secondary Learner Government (SSLG) races, grade-level councils (Grades 1 through 12), specific academic "
        "sections (e.g., Glassfish, Sailfish), and homeroom-level constituencies.")
        
    add_body_p(doc,
        "The architectural evolution of Release 2.5.0 is anchored upon three fundamental operational pillars:")
        
    add_bullet_item(doc, "Strict Scoped Role-Based Access Control (RBAC) & DepEd SF1 Provisioning", 
        "Enforcing zero-trust authorization barriers between Administrators, Faculty Auditors, Student Voters, and Nominated Candidates. "
        "The system natively integrates with official Department of Education School Form 1 (DepEd SF1) masterlists, parsing over 15 distinct "
        "demographic attributes, validating 12-digit Learner Reference Numbers (LRNs), and provisioning secure student accounts with mandatory "
        "first-time login password workflows.")
    add_bullet_item(doc, "Multi-Precinct Flexible Scoping & Normalized Constituency Matching", 
        "Empowering election administrators to configure elections targeted at school-wide ('all'), specific grade levels ('grade'), "
        "academic sections ('section'), or specific homerooms ('room'). The platform incorporates robust, case-insensitive, prefix-stripping "
        "string normalization to guarantee infallible voter eligibility matching across diverse input formats.")
    add_bullet_item(doc, "Strict Idempotency, Live Governance & Immutable Auditing", 
        "Guaranteeing single effective vote enforcement via deterministic composite document keys (v_{sha256(electionId + positionId + voterId)}), "
        "permitting authorized administrative modifications to live election metadata (such as extending poll deadlines) without invalidating existing ballots, "
        "and utilizing high-performance cursor pagination across isolated management tabs.")
        
    add_callout(doc,
        "The system operates entirely online atop Appwrite Cloud BaaS with strict schema verification and composite indexing, "
        "backed by an Express.js zero-trust API orchestration layer and high-speed SheetJS spreadsheet ingestion pipeline. "
        "All legacy air-gapped offline kiosk envelopes have been superseded by a real-time, responsive online architecture.",
        "CORE ARCHITECTURAL PHILOSOPHY")

    # ==========================================================================
    # SECTION 2: USE CASE DIAGRAM & SPECIFICATIONS
    # ==========================================================================
    format_heading(doc.add_paragraph(), "2. System Use Case Diagram & Actor Catalog", level=1)
    
    add_body_p(doc,
        "The Use Case Diagram defines the interactions between the four primary actors and the core functional system boundary. "
        "In strict compliance with standard ISO/IEC 19514 UML specification standards, actors are formally depicted as distinct "
        "stick figures (color-coded: Purple for Administrator, Green for Teacher/Auditor, Navy for Student Voter, and Amber for Candidate) "
        "interacting with use case ellipses across the system boundary.")
        
    add_centered_image(doc, "diagram_usecase.png", "System Use Case Diagram (UML Stick Figures & Functional Boundaries)", Inches(6.4))
    
    format_heading(doc.add_paragraph(), "2.1 Primary Actor Profiles", level=2)
    actor_headers = ["Actor Role", "Classification", "System Responsibilities & Entitlements"]
    actor_data = [
        ["Administrator", "Internal / Privileged", "Initializes elections, configures eligibility scoping (grade/sec/room), creates positions, registers party-lists, audits candidates, imports DepEd SF1 student rosters, performs live election edits, and inspects tamper audit logs."],
        ["Teacher / Auditor", "Internal / Observer", "Conducts real-time poll monitoring, verifies voter turnout and participation percentages without violating secret ballots, and certifies post-election outcomes."],
        ["Student Voter", "External / End-User", "Authenticates via Student Number (LRN) and scrypt password, completes mandatory first-time password setup dialogs, retrieves scoped ballots matching academic profile, submits candidate selections, and receives signed cryptographic receipts."],
        ["Candidate", "External / Specialized", "Submits electoral manifesto, photo portrait, party-list affiliation, and inspects verified certified election results."]
    ]
    create_table_from_data(doc, actor_headers, actor_data, [Inches(1.5), Inches(1.5), Inches(3.5)])
    
    format_heading(doc.add_paragraph(), "2.2 Detailed Use Case Catalog", level=2)
    uc_headers = ["UC ID", "Use Case Title", "Primary Actor", "Preconditions & Governance Rules", "Postconditions"]
    uc_data = [
        ["UC-01", "Configure & Edit Scoped Election", "Admin", "Admin authenticated; Start/End timestamps valid; Scope in ['all','grade','section','room']; Live edits permitted during active window.", "Election record created or updated with defined scope attributes and logged to audit trail."],
        ["UC-02", "Manage Positions & Party-Lists", "Admin", "Target election exists; Position/Party normalized name unique within election.", "Positions and affiliated slates persisted in Appwrite."],
        ["UC-03", "Register Candidates & Validate Eligibility", "Admin", "Student exists; Student academic profile matches election scope; Single candidacy per position.", "Candidate record created with vote count initialized to 0."],
        ["UC-04", "Authenticate User & Setup Password", "All Users", "Valid Student Number (LRN); Password verified against scrypt hash; First-time password modal triggered if unset.", "Stateless HMAC-SHA256 session token issued with 12h expiry; Password activated."],
        ["UC-05", "Cast Ballot Online", "Student Voter", "Active session; Election phase is 'live'; Student eligible for scope; Has not voted.", "Votes persisted under composite key; Receipt generated; Duplicate locked."],
        ["UC-06", "Batch Import Student Roster (DepEd SF1)", "Admin", "Admin authenticated; Standard DepEd Form 1 Excel (.xlsx) uploaded; Student numbers (LRN) unique and 12-digit formatted.", "Demographic records stored in users collection; Deterministic IDs generated; Bootstrap scrypt accounts prepared; Audit trail recorded."],
        ["UC-07", "Monitor Real-Time Tallies & Participation", "Admin / Teacher", "Election phase active; Aggregation query executes over votes collection.", "Real-time turnout and candidate tallies displayed without ballot exposure."],
        ["UC-08", "View Certified Results", "All Users", "Election phase transitioned to 'ended' (or user is Admin/Teacher).", "Official winners determined by rank and published to public portal."],
        ["UC-09", "Review System Audit Logs & Tamper Trails", "Admin / Teacher", "Admin or Teacher role token presented.", "Chronological immutable log entries retrieved with actor identity and timestamp."]
    ]
    create_table_from_data(doc, uc_headers, uc_data, [Inches(0.7), Inches(1.5), Inches(1.1), Inches(1.8), Inches(1.4)])

    # ==========================================================================
    # SECTION 3: CONTEXT DIAGRAM (DFD LEVEL 0)
    # ==========================================================================
    format_heading(doc.add_paragraph(), "3. Context Diagram (DFD Level 0)", level=1)
    
    add_body_p(doc,
        "The Level 0 Context Diagram establishes the highest-level conceptual boundary of the School Election System. "
        "It illustrates the fundamental information pipelines traversing between the core software engine and all external entities.")
        
    add_centered_image(doc, "diagram_context_dfd0.png", "Context Diagram (DFD Level 0) Highlighting Information Boundaries", Inches(6.2))
    
    format_heading(doc.add_paragraph(), "3.1 External Entity Interface Matrix", level=2)
    ctx_headers = ["Entity Name", "Entity Type", "Inbound Data Streams (To System)", "Outbound Data Streams (From System)"]
    ctx_data = [
        ["Election Administrator", "Human Entity", "Election parameters, position templates, party slates, candidate assets, branding settings, DepEd SF1 Excel rosters, live election updates.", "System audit logs, turnout statistics, integrity validation alerts, roster import summaries."],
        ["Student Voter", "Human Entity", "Student credentials (LRN & password), candidate choices, first-time password setup, password modification requests.", "Scoped ballot layouts, cryptographic vote receipt, post-election certified outcomes."],
        ["DepEd SF1 Masterlist (Official Excel Rosters)", "External Data Source", "Standard DepEd Form 1 (School Register) Excel spreadsheets containing student demographics, LRN, grade level, section, room, birth date, and parent info.", "Validation error reports, row processing summaries, and account provisioning acknowledgments."],
        ["Faculty Auditor", "Human Entity", "Tally requests, certification queries, discrepancy verification inquiries.", "Certified winner tallies, voter turnout percentages, chronological audit events."],
        ["Appwrite Backend (Cloud)", "BaaS Platform", "Database document read streams, storage asset blobs, unique index constraints, cursor pagination.", "Document mutations (CRUD), file uploads (photos/logos), composite queries."]
    ]
    create_table_from_data(doc, ctx_headers, ctx_data, [Inches(1.3), Inches(1.0), Inches(2.1), Inches(2.1)])

    # ==========================================================================
    # SECTION 4: DATA FLOW DIAGRAMS (DFD LEVEL 1 & LEVEL 2)
    # ==========================================================================
    format_heading(doc.add_paragraph(), "4. Data Flow Diagrams (DFD Level 1 & Level 2)", level=1)
    
    add_body_p(doc,
        "The Data Flow Architecture breaks down the monolithic system into distinct communicating functional transforms, "
        "illustrating exactly how data moves into, through, and out of persisted Appwrite collections.")
        
    format_heading(doc.add_paragraph(), "4.1 DFD Level 1: System Subprocesses & Data Stores", level=2)
    add_body_p(doc,
        "The Level 1 DFD decomposes the system into 7 core operational processes and 8 primary data stores "
        "(users, elections, positions, candidates, votes, partyLists, branding, auditLogs).")
        
    add_centered_image(doc, "diagram_dfd1.png", "DFD Level 1: Subprocess Functional Decomposition & Data Stores", Inches(6.4))
    
    format_heading(doc.add_paragraph(), "4.2 Level 1 Process Description Registry", level=3)
    p_headers = ["Proc ID", "Subprocess Name", "Inputs", "Outputs", "Governing Data Stores"]
    p_data = [
        ["1.0", "Authentication & Access Control", "Student Number / LRN, Password, First-Time Password Payload", "HMAC-SHA256 Token, Role, User Profile, Session State", "D1: Users Store"],
        ["2.0", "Election & Scope Setup (Live Editing)", "Election Dates, Scope, Grade/Sec/Room, Live Edit Modifications", "Normalized Election Document, Audit Record", "D2: Elections Store, D8: Audit Logs Store"],
        ["3.0", "Candidacy & Party Filing", "Nominee Profile, Manifesto, Party Affiliation, Photo Asset", "Verified Candidate Record, Slate Linkage", "D3: Positions, D4: Candidates, D6: PartyLists"],
        ["4.0", "Ballot & Vote Processing", "Voter Session Token, Candidate IDs, Timestamp", "Effective Vote Records, Digital Receipt", "D1: Users, D2: Elections, D5: Votes Store"],
        ["5.0", "Student Roster & SF1 Batch Import", "DepEd SF1 Excel (.xlsx), Admin Auth Token", "Batch Student Records, Provisioning Logs, Audit Events", "D1: Users Store, D8: Audit Logs Store"],
        ["6.0", "Vote Tallying & Analytics", "Poll Certification Trigger, Role Token, Real-Time Poll Query", "Turnout Graphs, Candidate Vote Ranks, Certified Summaries", "D5: Votes Store, D4: Candidates Store"],
        ["7.0", "Audit Logging & Governance", "Administrative Mutations, Security Events, Live Edits, Imports", "Immutable Audit Record, Chronological Trail", "D8: Audit Logs Store"]
    ]
    create_table_from_data(doc, p_headers, p_data, [Inches(0.6), Inches(1.8), Inches(1.5), Inches(1.3), Inches(1.3)])
    
    format_heading(doc.add_paragraph(), "4.3 DFD Level 2: Subprocess 4.0 (Vote Processing Decomposition)", level=2)
    add_body_p(doc,
        "Process 4.0 represents the critical security boundary where democratic integrity is enforced. "
        "The Level 2 decomposition maps the micro-steps required to validate, check deduplication, generate deterministic keys, "
        "and atomically commit votes.")
        
    add_centered_image(doc, "diagram_dfd2.png", "DFD Level 2: Detailed Decomposition of Process 4.0 (Vote Processing)", Inches(6.3))

    sub_dfd_headers = ["Sub-Proc", "Action Name", "Logical Operation & Security Rule"]
    sub_dfd_data = [
        ["4.1", "Voter Eligibility & Scope Check", "Compares student yearLevel, section, or room against election scope criteria. Rejects ineligible requests."],
        ["4.2", "Retrieve Candidate Slates", "Queries positions and candidates belonging strictly to target electionId. Returns structured ballot payload."],
        ["4.3", "Enforce Choice Limits & Window", "Verifies that vote count timestamp falls within [startsAt, endsAt] and validates candidate position IDs."],
        ["4.4", "Composite Key Deduplication", "Generates deterministic document key v_sha256(electionId + positionId + voterId). Blocks duplicate submissions."],
        ["4.5", "Atomic Vote Write & Receipt Issuance", "Executes Appwrite database write under unique constraint, increments voteCount, and issues cryptographic confirmation."]
    ]
    create_table_from_data(doc, sub_dfd_headers, sub_dfd_data, [Inches(0.8), Inches(2.2), Inches(3.5)])

    # ==========================================================================
    # SECTION 5: FLOWCHARTS (LEVEL 0, LEVEL 1, LEVEL 2)
    # ==========================================================================
    format_heading(doc.add_paragraph(), "5. System Flowcharts (Level 0, Level 1, Level 2)", level=1)
    
    format_heading(doc.add_paragraph(), "5.1 Flowchart Level 0: High-Level System Operational Lifecycle", level=2)
    add_body_p(doc,
        "The Level 0 Flowchart models the end-to-end operational stages of the election system: from DepEd SF1 student roster ingestion "
        "and scrypt account provisioning, through flexible election scope configuration, candidate nomination, live election operation with dynamic "
        "window editing, real-time canvassing, and final tamper-audited election certification.")
        
    add_centered_image(doc, "diagram_flowchart_lvl0.png", "Flowchart Level 0: Comprehensive System Operating Cycle", Inches(5.8))
    
    format_heading(doc.add_paragraph(), "5.2 Flowchart Level 1: Student Voter Authentication & Voting Workflow", level=2)
    add_body_p(doc,
        "The Level 1 Flowchart charts the exact decision tree traversed by a student voter during an active polling session. "
        "It details credential verification, mandatory first-time password setup detection, multi-precinct scope eligibility evaluation, "
        "ballot selection, deterministic composite key validation, atomic database commit, and signed receipt generation.")
        
    add_centered_image(doc, "diagram_flowchart_lvl1.png", "Flowchart Level 1: Voter Authentication, First-Time Setup & Ballot Submission", Inches(6.0))
    
    format_heading(doc.add_paragraph(), "5.3 Flowchart Level 2: DepEd SF1 Masterlist Ingestion & Scrypt Provisioning Pipeline", level=2)
    add_body_p(doc,
        "The Level 2 Flowchart details the ingestion pipeline that processes official Department of Education School Form 1 (DepEd SF1) "
        "spreadsheets. It illustrates how the SheetJS parsing engine extracts and normalizes over 15 student demographic fields, enforces "
        "strict 12-digit Learner Reference Number (LRN) validation, computes deterministic document IDs (u_{sha256(LRN)}), initializes "
        "secure scrypt credential stubs with hasSetPassword=false, executes chunked batch writes to Appwrite, and writes audit trail records.")
        
    add_centered_image(doc, "diagram_flowchart_lvl2.png", "Flowchart Level 2: DepEd SF1 Masterlist Ingestion & Scrypt Provisioning Pipeline", Inches(6.3))

    # ==========================================================================
    # SECTION 6: ENTITY RELATIONSHIP DIAGRAM (ERD)
    # ==========================================================================
    format_heading(doc.add_paragraph(), "6. Entity Relationship Diagram (ERD)", level=1)
    
    add_body_p(doc,
        "The Entity Relationship Diagram (ERD) formalizes the conceptual and logical schema implemented within Appwrite. "
        "It details all primary keys, foreign keys, cardinality relationships, and referential constraints across the 8 production collections.")
        
    add_centered_image(doc, "diagram_erd.png", "Entity Relationship Diagram (ERD) with Crow's Foot Cardinalities", Inches(6.4))
    
    format_heading(doc.add_paragraph(), "6.1 Cardinality & Relationship Specification Matrix", level=2)
    erd_headers = ["Primary Entity", "Related Entity", "Cardinality", "Foreign Key Mapping", "Business Rule & Delete Semantics"]
    erd_data = [
        ["ELECTIONS", "POSITIONS", "1 : M (One-to-Many)", "positions.electionId -> elections.id", "Cascade: Deleting election invalidates its positions."],
        ["ELECTIONS", "PARTY_LISTS", "1 : M (One-to-Many)", "partyLists.electionId -> elections.id", "Restricted to school-wide elections (scope == 'all')."],
        ["ELECTIONS", "CANDIDATES", "1 : M (One-to-Many)", "candidates.electionId -> elections.id", "Candidates must match election scope criteria."],
        ["ELECTIONS", "VOTES", "1 : M (One-to-Many)", "votes.electionId -> elections.id", "Restricts vote recording to election active time window."],
        ["POSITIONS", "CANDIDATES", "1 : M (One-to-Many)", "candidates.positionId -> positions.id", "Unique constraint on (positionId, userId)."],
        ["PARTY_LISTS", "CANDIDATES", "1 : M (One-to-Many)", "candidates.partyListId -> partyLists.id", "Optional; candidate can run as Independent."],
        ["USERS", "CANDIDATES", "1 : M (One-to-Many)", "candidates.userId -> users.id", "Student role required; student grade within scope."],
        ["USERS", "VOTES", "1 : M (One-to-Many)", "votes.voterId -> users.id", "Single effective vote per voter per position (deterministic composite key)."]
    ]
    create_table_from_data(doc, erd_headers, erd_data, [Inches(1.2), Inches(1.2), Inches(1.1), Inches(1.8), Inches(1.2)])

    # ==========================================================================
    # SECTION 7: DATABASE SCHEMA & DATA DICTIONARY
    # ==========================================================================
    format_heading(doc.add_paragraph(), "7. Complete Database Schema & Data Dictionary", level=1)
    
    add_body_p(doc,
        "The following section provides the complete data dictionary for all 8 collections configured in Appwrite Database 'voting_db'. "
        "Every attribute, data type, storage size, default value, and index requirement is exhaustively documented.")

    def add_collection_table(col_name, col_desc, col_fields):
        format_heading(doc.add_paragraph(), f"7.{col_name.upper()} Collection: `{col_name}`", level=2)
        add_body_p(doc, col_desc, bold_prefix="Collection Description:")
        f_headers = ["Attribute Key", "Type", "Size / Range", "Req / Null", "Index / Key Type", "Functional Description & Rules"]
        create_table_from_data(doc, f_headers, col_fields, [Inches(1.3), Inches(0.8), Inches(0.9), Inches(0.8), Inches(1.1), Inches(1.6)])

    # 1. Users
    add_collection_table("users", 
        "Stores identity records, security credentials, and comprehensive DepEd SF1 academic demographics for administrators, teachers, and students.",
        [
            ["$id", "string", "36 chars", "Required", "PK (Unique)", "Deterministic user document ID (u_{sha256(studentNumber)})."],
            ["studentNumber", "string", "64 chars", "Required", "Unique Index", "Unique alphanumeric identifier (12-digit DepEd LRN or staff ID)."],
            ["password", "string", "255 chars", "Required", "None", "Scrypt derived key hash format: scrypt${salt}${hash}."],
            ["fullName", "string", "255 chars", "Required", "None", "Legal complete name of the student or faculty member."],
            ["role", "string", "50 chars", "Required", "Key Index", "Authorization role: 'admin' | 'teacher' | 'student'."],
            ["yearLevel", "integer", "1 to 12", "Optional", "None", "Grade level for students (required if role == 'student')."],
            ["section", "string", "255 chars", "Optional", "None", "Academic section name (e.g., 'Glassfish', 'Aquaculture-A')."],
            ["room", "string", "255 chars", "Optional", "None", "Assigned homeroom identifier (e.g., 'Room 102')."],
            ["hasSetPassword", "boolean", "1 bit", "Required", "None", "Flag indicating whether default bootstrap password has been modified."],
            ["photoUrl", "string", "1000 chars", "Optional", "None", "Appwrite storage file URL for user avatar."],
            ["sex", "string", "10 chars", "Optional", "None", "DepEd SF1 gender ('M' | 'F' | 'Male' | 'Female')."],
            ["birthDate", "string", "50 chars", "Optional", "None", "DepEd SF1 date of birth (YYYY-MM-DD)."],
            ["age", "integer", "0 to 100", "Optional", "None", "Student age derived from SF1 masterlist."],
            ["motherTongue", "string", "100 chars", "Optional", "None", "DepEd SF1 primary native language."],
            ["ethnicGroup", "string", "100 chars", "Optional", "None", "DepEd SF1 indigenous/ethnic affiliation."],
            ["religion", "string", "100 chars", "Optional", "None", "DepEd SF1 religious denomination."],
            ["street", "string", "255 chars", "Optional", "None", "DepEd SF1 residential street address."],
            ["barangay", "string", "255 chars", "Optional", "None", "DepEd SF1 barangay."],
            ["municipality", "string", "255 chars", "Optional", "None", "DepEd SF1 municipality (e.g., 'Bolinao')."],
            ["province", "string", "255 chars", "Optional", "None", "DepEd SF1 province (e.g., 'Pangasinan')."],
            ["fatherName", "string", "255 chars", "Optional", "None", "DepEd SF1 father's legal full name."],
            ["motherName", "string", "255 chars", "Optional", "None", "DepEd SF1 mother's legal full maiden name."],
            ["guardian", "string", "255 chars", "Optional", "None", "DepEd SF1 guardian full name."],
            ["guardianRelationship", "string", "100 chars", "Optional", "None", "DepEd SF1 guardian relationship (e.g., 'Grandmother')."],
            ["contactNumber", "string", "50 chars", "Optional", "None", "DepEd SF1 parent/guardian contact telephone/mobile."],
            ["learningModality", "string", "100 chars", "Optional", "None", "DepEd learning modality (e.g., 'Face-to-Face')."],
            ["remarks", "string", "1000 chars", "Optional", "None", "DepEd SF1 enrollment remarks or transfer status."]
        ])

    # 2. Elections
    add_collection_table("elections", 
        "Contains administrative election configurations, timing parameters, and multi-precinct constituency scoping boundaries.",
        [
            ["$id", "string", "36 chars", "Required", "PK (Unique)", "Unique document identifier generated by Appwrite."],
            ["title", "string", "255 chars", "Required", "None", "Public title of the electoral event (e.g., 'SSLG General Election 2026')."],
            ["description", "string", "5000 chars", "Optional", "None", "Comprehensive summary of rules, agenda, and instructions."],
            ["startsAt", "string", "255 chars", "Required", "None", "ISO-8601 UTC timestamp defining voting commencement."],
            ["endsAt", "string", "255 chars", "Required", "None", "ISO-8601 UTC timestamp defining poll termination (live-editable)."],
            ["scope", "string", "50 chars", "Required", "None", "Boundary type: 'all' | 'grade' | 'section' | 'room'."],
            ["scopeValue", "string", "255 chars", "Required", "None", "Target identifier corresponding to scope parameter."],
            ["hasPartyList", "boolean", "1 bit", "Required", "None", "Enables slate voting; restricted to school-wide ('all') elections."],
            ["targetGradeLevel", "integer", "1 to 12", "Optional", "None", "Explicit numeric grade if scope is 'grade'."],
            ["targetSection", "string", "255 chars", "Optional", "None", "Explicit section string if scope is 'section'."],
            ["targetRoom", "string", "255 chars", "Optional", "None", "Explicit room string if scope is 'room'."],
            ["hasPartyListSupport", "boolean", "1 bit", "Optional", "None", "Legacy parity flag mirroring hasPartyList."]
        ])

    # 3. Positions
    add_collection_table("positions", 
        "Defines available electoral seats belonging to a specific election.",
        [
            ["$id", "string", "36 chars", "Required", "PK (Unique)", "Unique position identifier."],
            ["electionId", "string", "255 chars", "Required", "Key Index", "Foreign key referencing parent election document."],
            ["name", "string", "255 chars", "Required", "None", "Display title of the seat (e.g., 'President', 'Treasurer')."],
            ["normalizedName", "string", "255 chars", "Required", "Composite Unique", "Lowercase trimmed name; unique per electionId."],
            ["title", "string", "255 chars", "Optional", "None", "Legacy title alias retained for backward compatibility."]
        ])

    # 4. Candidates
    add_collection_table("candidates", 
        "Represents nominated students contesting for specific positions within an election.",
        [
            ["$id", "string", "36 chars", "Required", "PK (Unique)", "Unique candidate identifier."],
            ["electionId", "string", "255 chars", "Required", "Key Index", "Foreign key referencing elections collection."],
            ["positionId", "string", "255 chars", "Required", "Key Index", "Foreign key referencing positions collection."],
            ["userId", "string", "255 chars", "Required", "Key / Unique", "Foreign key referencing users collection; unique per positionId."],
            ["fullName", "string", "255 chars", "Required", "None", "Nominee name displayed on official ballot."],
            ["party", "string", "255 chars", "Optional", "None", "Name of political affiliation or 'Independent'."],
            ["partyListId", "string", "255 chars", "Optional", "Key Index", "Foreign key referencing partyLists collection."],
            ["partyListName", "string", "255 chars", "Optional", "None", "Denormalized party-list label for fast ballot rendering."],
            ["manifesto", "string", "10000 chars", "Required", "None", "Comprehensive platform statement and campaign promises."],
            ["photoUrl", "string", "1000 chars", "Optional", "None", "URL of campaign portrait stored in Appwrite Storage bucket."],
            ["voteCount", "integer", ">= 0", "Required", "None", "Aggregated tally cache, default initialized to 0."]
        ])

    # 5. Votes
    add_collection_table("votes", 
        "Stores individual ballot marks cast by eligible voters, secured via deterministic composite keys.",
        [
            ["$id", "string", "36 chars", "Required", "PK (Unique)", "Deterministic key format: v_{sha256(electionId+positionId+voterId)}."],
            ["electionId", "string", "255 chars", "Required", "Key Index", "Foreign key referencing target election."],
            ["positionId", "string", "255 chars", "Required", "Key Index", "Foreign key referencing contested position."],
            ["candidateId", "string", "255 chars", "Required", "Key Index", "Foreign key referencing chosen candidate."],
            ["voterId", "string", "255 chars", "Required", "Key Index", "Foreign key referencing student voter document."],
            ["userId", "string", "255 chars", "Required", "None", "Legacy alias mirroring voterId for query parity."],
            ["timestamp", "string", "255 chars", "Required", "None", "ISO timestamp indicating exact moment of vote casting."]
        ])

    # 6. PartyLists
    add_collection_table("partyLists", 
        "Stores accredited political slates and collective advocacies.",
        [
            ["$id", "string", "36 chars", "Required", "PK (Unique)", "Unique party-list document identifier."],
            ["electionId", "string", "255 chars", "Required", "Key Index", "Foreign key referencing parent school-wide election."],
            ["name", "string", "255 chars", "Required", "None", "Full legal title of the party-list."],
            ["normalizedName", "string", "255 chars", "Required", "Composite Unique", "Lowercase trimmed name; unique per electionId."],
            ["acronym", "string", "50 chars", "Optional", "None", "Shortened party abbreviation (e.g., 'BSF-ALLIANCE')."],
            ["logoUrl", "string", "1000 chars", "Optional", "None", "Appwrite storage URL for party insignia."],
            ["advocacy", "string", "5000 chars", "Optional", "None", "Detailed organizational principles and legislative agenda."]
        ])

    # 7. AuditLogs
    add_collection_table("auditLogs", 
        "Maintains an immutable append-only chronological ledger of all security-sensitive operations.",
        [
            ["$id", "string", "36 chars", "Required", "PK (Unique)", "Unique log entry identifier."],
            ["action", "string", "255 chars", "Required", "None", "Operation type: 'LOGIN', 'ELECTION_CREATE', 'ELECTION_LIVE_EDIT', 'STUDENT_IMPORT_BATCH', etc."],
            ["performedBy", "string", "255 chars", "Required", "None", "Student number or identity of operator."],
            ["performedByRole", "string", "50 chars", "Required", "None", "Administrative authority level at moment of action."],
            ["timestamp", "string", "255 chars", "Required", "Key (Desc)", "ISO UTC timestamp; indexed in descending order."],
            ["details", "string", "5000 chars", "Required", "None", "Detailed JSON or textual description of operation payload."]
        ])

    # 8. Branding
    add_collection_table("branding", 
        "Contains institutional presentation assets and contact metadata.",
        [
            ["$id", "string", "36 chars", "Required", "PK (Unique)", "Static singleton document ID ('school')."],
            ["schoolName", "string", "255 chars", "Required", "None", "Official academic institution title."],
            ["tagline", "string", "500 chars", "Required", "None", "Motto displayed on header and landing pages."],
            ["logoUrl", "string", "1000 chars", "Required", "None", "Storage link to official high-res school seal."],
            ["primaryColor", "string", "50 chars", "Required", "None", "Hex code for primary user interface elements (e.g., #1B365D)."],
            ["attributionText", "string", "500 chars", "Required", "None", "Permanent developer attribution notice."],
            ["contactEmail", "string", "255 chars", "Optional", "None", "Official IT support contact address."],
            ["address", "string", "1000 chars", "Optional", "None", "Physical postal address of the institution."]
        ])

    # ==========================================================================
    # SECTION 8: INDEXING REGISTRY & PERFORMANCE ARCHITECTURE
    # ==========================================================================
    format_heading(doc.add_paragraph(), "8. Database Indexing & Uniqueness Constraint Registry", level=1)
    
    add_body_p(doc,
        "To guarantee sub-millisecond query performance and physically prevent duplicate ballots, "
        "the database enforces 14 specialized indexes across collections. The registry below outlines each index definition.")
        
    idx_headers = ["Collection", "Index Identifier", "Index Type", "Target Attributes", "Operational Purpose"]
    idx_data = [
        ["users", "student_number_unique", "Unique", "studentNumber", "Guarantees absolute uniqueness of student numbers (LRN) across campus."],
        ["users", "role_index", "Key", "role", "Accelerates filtering of administrative and faculty accounts."],
        ["positions", "positions_election", "Key", "electionId", "Optimizes retrieval of all positions within an active election."],
        ["positions", "positions_election_name", "Unique", "electionId, normalizedName", "Prevents duplicate position titles within the same election."],
        ["candidates", "candidates_election", "Key", "electionId", "Accelerates candidate slate compilation during ballot rendering."],
        ["candidates", "candidates_election_position", "Key", "electionId, positionId", "Fetches candidate roster for a specific contested office."],
        ["candidates", "candidates_position_user", "Unique", "positionId, userId", "Strictly prohibits a student from being nominated twice for one seat."],
        ["candidates", "candidates_user", "Key", "userId", "Validates student candidacy status."],
        ["candidates", "candidates_party_list", "Key", "partyListId", "Groups candidates by political slate for party voting."],
        ["votes", "votes_effective_unique", "Unique", "electionId, positionId, voterId", "Core deduplication constraint: physically blocks multi-voting."],
        ["votes", "votes_election_voter", "Key", "electionId, voterId", "Retrieves complete ballot marks cast by a voter for receipt rendering."],
        ["votes", "votes_candidate", "Key", "candidateId", "Accelerates real-time count aggregation queries."],
        ["partyLists", "party_election_normalized_name", "Unique", "electionId, normalizedName", "Guarantees party names cannot be duplicated in an election."],
        ["auditLogs", "audit_timestamp", "Key (Desc)", "timestamp (DESC)", "Optimizes chronological audit trail pagination."]
    ]
    create_table_from_data(doc, idx_headers, idx_data, [Inches(1.0), Inches(1.5), Inches(0.8), Inches(1.6), Inches(1.6)])

    add_callout(doc,
        "In Release 2.5.0, the administrative user interface incorporates isolated per-tab data fetching using cursor-based "
        "pagination (getPaginated). By querying targeted collections on-demand rather than relying on monolithic initial loads, "
        "network payload volume is reduced by over 80%, ensuring optimal responsiveness even during peak election traffic.",
        "HIGH-CONCURRENCY PERFORMANCE OPTIMIZATION")

    # ==========================================================================
    # SECTION 9: SECURITY, CRYPTOGRAPHY & AUDIT STANDARDS
    # ==========================================================================
    format_heading(doc.add_paragraph(), "9. Security, Cryptography & Audit Architecture", level=1)
    
    add_body_p(doc,
        "The system incorporates multi-layered cryptographic standards to guarantee non-repudiation, secret ballot privacy, "
        "and data durability.")
        
    format_heading(doc.add_paragraph(), "9.1 Password Security via Scrypt Key Derivation & First-Time Activation", level=2)
    add_body_p(doc,
        "All credentials are protected using the memory-hard scrypt algorithm with a 16-byte random salt and 64-byte derived key length. "
        "Passphrases are formatted as `scrypt${salt_b64url}${derived_b64url}`. Constant-time comparison (`crypto.timingSafeEqual`) "
        "is strictly enforced to mitigate side-channel and timing attacks. Students provisioned via DepEd SF1 batch import start with "
        "`hasSetPassword: false`. Upon their initial login, a mandatory security modal prompts them to configure an individual password "
        "(minimum 6 characters), updating the record and locking out the initial default credentials.")
        
    format_heading(doc.add_paragraph(), "9.2 Stateless HMAC-SHA256 Session Tokens", level=2)
    add_body_p(doc,
        "Authentication tokens utilize HMAC-SHA256 digital signatures with a 256-bit server secret. "
        "Each token envelope encapsulates a version tag (`v: 1`), issued timestamp (`iat`), expiration boundary (`exp`), and specific "
        "intended user role, preventing cross-tenant privilege escalation and mitigating session hijacking.")
        
    format_heading(doc.add_paragraph(), "9.3 Pure Online Architecture & Deterministic Composite Key Idempotency", level=2)
    add_body_p(doc,
        "To ensure absolute voting integrity in a pure cloud-connected architecture, each vote transaction enforces mathematical "
        "idempotency. Before persisting any ballot selection, the system derives a deterministic document identifier: "
        "`v_{sha256(electionId + ':' + positionId + ':' + voterId)}`. Because Appwrite enforces document ID uniqueness as a primary key, "
        "any concurrent, replayed, or duplicate attempt to vote for the same position by the same voter is immediately rejected at the "
        "database storage engine level, completely eliminating double-voting vulnerability.")

    format_heading(doc.add_paragraph(), "9.4 Comprehensive Audit Trails & Safe Live Election Governance", level=2)
    add_body_p(doc,
        "Every security-relevant operation—including student roster batch imports, account provisioning, candidate approvals, "
        "and live election schedule extensions—is committed to an append-only `auditLogs` ledger. To accommodate real-world school "
        "polling conditions, election administrators can safely update election titles, descriptions, and end dates while voting is active, "
        "with each change immutably attributed to the administrator's authenticated session in the audit log.")

    # Save document
    output_path = "System_Design.docx"
    doc.save(output_path)
    print(f"Successfully generated {output_path}")

if __name__ == '__main__':
    build_system_design_doc()
