import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, BoxStyle, Circle, Polygon
import numpy as np

# Set standard styles
NAVY = "#1B365D"
SLATE_BLUE = "#2E5B88"
LIGHT_BLUE = "#EBF3FB"
BORDER_BLUE = "#4A90E2"
ACCENT_GREEN = "#27AE60"
LIGHT_GREEN = "#EAFAF1"
BORDER_GREEN = "#2ECC71"
ACCENT_AMBER = "#D35400"
LIGHT_AMBER = "#FDF2E9"
BORDER_AMBER = "#E67E22"
DARK_GRAY = "#2C3E50"
MID_GRAY = "#7F8C8D"
LIGHT_GRAY = "#F8F9F9"
BORDER_GRAY = "#BDC3C7"
PURPLE = "#8E44AD"
LIGHT_PURPLE = "#F4ECF7"
BORDER_PURPLE = "#9B59B6"

def draw_rounded_box(ax, x, y, w, h, text, facecolor, edgecolor, fontsize=9, bold=False, text_color=DARK_GRAY, radius=0.03):
    box = FancyBboxPatch((x, y), w, h,
                         boxstyle=f"round,pad={radius},rounding_size={radius}",
                         facecolor=facecolor, edgecolor=edgecolor, linewidth=1.5, zorder=2)
    ax.add_patch(box)
    weight = 'bold' if bold else 'normal'
    ax.text(x + w/2, y + h/2, text, ha='center', va='center', fontsize=fontsize,
            weight=weight, color=text_color, zorder=3, wrap=True)

def draw_oval(ax, x, y, w, h, text, facecolor, edgecolor, fontsize=9, bold=False, text_color=DARK_GRAY):
    ellipse = patches.Ellipse((x + w/2, y + h/2), w, h, facecolor=facecolor, edgecolor=edgecolor, linewidth=1.5, zorder=2)
    ax.add_patch(ellipse)
    weight = 'bold' if bold else 'normal'
    ax.text(x + w/2, y + h/2, text, ha='center', va='center', fontsize=fontsize,
            weight=weight, color=text_color, zorder=3)

def draw_diamond(ax, x, y, w, h, text, facecolor, edgecolor, fontsize=8, bold=False, text_color=DARK_GRAY):
    points = [
        (x + w/2, y + h),      # Top
        (x + w, y + h/2),      # Right
        (x + w/2, y),          # Bottom
        (x, y + h/2)           # Left
    ]
    poly = patches.Polygon(points, facecolor=facecolor, edgecolor=edgecolor, linewidth=1.5, zorder=2)
    ax.add_patch(poly)
    weight = 'bold' if bold else 'normal'
    ax.text(x + w/2, y + h/2, text, ha='center', va='center', fontsize=fontsize,
            weight=weight, color=text_color, zorder=3)

def draw_cylinder(ax, x, y, w, h, text, facecolor, edgecolor, fontsize=8, bold=False, text_color=DARK_GRAY):
    # Base box
    box = patches.Rectangle((x, y), w, h, facecolor=facecolor, edgecolor=edgecolor, linewidth=1.5, zorder=2)
    ax.add_patch(box)
    # top line to simulate data store
    ax.plot([x, x+w], [y+h, y+h], color=edgecolor, linewidth=2, zorder=3)
    ax.plot([x, x+w], [y, y], color=edgecolor, linewidth=2, zorder=3)
    ax.plot([x+0.2*w, x+0.2*w], [y, y+h], color=edgecolor, linewidth=1, linestyle='--', zorder=3)
    weight = 'bold' if bold else 'normal'
    ax.text(x + 0.6*w, y + h/2, text, ha='center', va='center', fontsize=fontsize,
            weight=weight, color=text_color, zorder=4)

def draw_arrow(ax, x1, y1, x2, y2, label="", rad=0.0, color=SLATE_BLUE, fontsize=8):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="->,head_width=0.35,head_length=0.45",
                                color=color, lw=1.4,
                                connectionstyle=f"arc3,rad={rad}"), zorder=1)
    if label:
        mid_x = (x1 + x2) / 2
        mid_y = (y1 + y2) / 2
        offset_y = 0.02 if rad >= 0 else -0.03
        ax.text(mid_x, mid_y + offset_y, label, ha='center', va='center',
                fontsize=fontsize, color=DARK_GRAY,
                bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none", alpha=0.85), zorder=4)

# ==============================================================================
# 1. USE CASE DIAGRAM
# ==============================================================================
def generate_usecase():
    fig, ax = plt.subplots(figsize=(12, 8.5), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    
    # Boundary box
    system_box = FancyBboxPatch((0.25, 0.05), 0.50, 0.90, boxstyle="round,pad=0.02,rounding_size=0.02",
                                facecolor="#FAFCFF", edgecolor=NAVY, linewidth=2, zorder=0)
    ax.add_patch(system_box)
    ax.text(0.50, 0.92, "School Election System Boundary", ha='center', va='center',
            fontsize=13, weight='bold', color=NAVY)
    
    # Actors (Left & Right)
    # Admin
    draw_rounded_box(ax, 0.03, 0.65, 0.16, 0.12, "Administrator\n(System Admin)",
                     facecolor=LIGHT_PURPLE, edgecolor=BORDER_PURPLE, fontsize=9, bold=True, text_color=PURPLE)
    
    # Teacher / Auditor
    draw_rounded_box(ax, 0.03, 0.25, 0.16, 0.12, "Teacher / Auditor\n(Faculty Observer)",
                     facecolor=LIGHT_GREEN, edgecolor=BORDER_GREEN, fontsize=9, bold=True, text_color=ACCENT_GREEN)
    
    # Student (Voter)
    draw_rounded_box(ax, 0.81, 0.65, 0.16, 0.12, "Student Voter\n(Eligible Student)",
                     facecolor=LIGHT_BLUE, edgecolor=BORDER_BLUE, fontsize=9, bold=True, text_color=NAVY)
    
    # Candidate Student
    draw_rounded_box(ax, 0.81, 0.25, 0.16, 0.12, "Candidate\n(Nominated Student)",
                     facecolor=LIGHT_AMBER, edgecolor=BORDER_AMBER, fontsize=9, bold=True, text_color=ACCENT_AMBER)
    
    # Use cases inside system
    uc_list = [
        (0.30, 0.82, 0.40, 0.065, "UC1: Configure Election & Scope (Grade/Sec/Room)"),
        (0.30, 0.73, 0.40, 0.065, "UC2: Manage Positions & Party-Lists"),
        (0.30, 0.64, 0.40, 0.065, "UC3: Register Candidates & Validate Eligibility"),
        (0.30, 0.55, 0.40, 0.065, "UC4: Authenticate User (Scrypt / HMAC Token)"),
        (0.30, 0.46, 0.40, 0.065, "UC5: Cast Ballot Online (Enforce Single/Duplicate Rule)"),
        (0.30, 0.37, 0.40, 0.065, "UC6: Generate & Ingest Offline Ballots (ECDH/AES)"),
        (0.30, 0.28, 0.40, 0.065, "UC7: Monitor Real-time Tallies & Participation"),
        (0.30, 0.19, 0.40, 0.065, "UC8: View Certified Results (Post-Election Phase)"),
        (0.30, 0.10, 0.40, 0.065, "UC9: Review System Audit Logs & Tamper Trails")
    ]
    
    for x, y, w, h, text in uc_list:
        draw_oval(ax, x, y, w, h, text, facecolor="white", edgecolor=BORDER_BLUE, fontsize=8.5, bold=False, text_color=DARK_GRAY)
    
    # Connections for Admin
    draw_arrow(ax, 0.19, 0.73, 0.30, 0.85, color=BORDER_PURPLE)
    draw_arrow(ax, 0.19, 0.72, 0.30, 0.76, color=BORDER_PURPLE)
    draw_arrow(ax, 0.19, 0.70, 0.30, 0.67, color=BORDER_PURPLE)
    draw_arrow(ax, 0.19, 0.68, 0.30, 0.40, color=BORDER_PURPLE)
    draw_arrow(ax, 0.19, 0.66, 0.30, 0.31, color=BORDER_PURPLE)
    draw_arrow(ax, 0.19, 0.65, 0.30, 0.13, color=BORDER_PURPLE)
    
    # Connections for Teacher
    draw_arrow(ax, 0.19, 0.33, 0.30, 0.31, color=BORDER_GREEN)
    draw_arrow(ax, 0.19, 0.31, 0.30, 0.22, color=BORDER_GREEN)
    draw_arrow(ax, 0.19, 0.29, 0.30, 0.13, color=BORDER_GREEN)
    
    # Connections for Student Voter
    draw_arrow(ax, 0.81, 0.71, 0.70, 0.58, color=BORDER_BLUE)
    draw_arrow(ax, 0.81, 0.69, 0.70, 0.49, color=BORDER_BLUE)
    draw_arrow(ax, 0.81, 0.67, 0.70, 0.40, color=BORDER_BLUE)
    draw_arrow(ax, 0.81, 0.65, 0.70, 0.22, color=BORDER_BLUE)
    
    # Connections for Candidate
    draw_arrow(ax, 0.81, 0.33, 0.70, 0.66, color=BORDER_AMBER)
    draw_arrow(ax, 0.81, 0.31, 0.70, 0.49, color=BORDER_AMBER)
    draw_arrow(ax, 0.81, 0.29, 0.70, 0.22, color=BORDER_AMBER)
    
    plt.tight_layout()
    plt.savefig('diagram_usecase.png', bbox_inches='tight', dpi=300)
    plt.close()
    print("Generated diagram_usecase.png")

# ==============================================================================
# 2. CONTEXT DIAGRAM (DFD LEVEL 0)
# ==============================================================================
def generate_context_diagram():
    fig, ax = plt.subplots(figsize=(11, 8), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    
    # Center System Bubble
    draw_oval(ax, 0.35, 0.38, 0.30, 0.24, "0.0\nBolinao School\nElection System\n(Core Engine)",
              facecolor=LIGHT_BLUE, edgecolor=NAVY, fontsize=11, bold=True, text_color=NAVY)
    
    # External Entities
    # Top: Administrator
    draw_rounded_box(ax, 0.38, 0.82, 0.24, 0.12, "E1: Election Administrator",
                     facecolor=LIGHT_PURPLE, edgecolor=BORDER_PURPLE, fontsize=9.5, bold=True, text_color=PURPLE)
    
    # Left: Student Voter
    draw_rounded_box(ax, 0.03, 0.42, 0.20, 0.16, "E2: Student Voter\n(Web Client)",
                     facecolor=LIGHT_BLUE, edgecolor=BORDER_BLUE, fontsize=9.5, bold=True, text_color=NAVY)
    
    # Right: Offline Voting Station
    draw_rounded_box(ax, 0.77, 0.42, 0.20, 0.16, "E3: Offline Voting Station\n(Air-Gapped Client)",
                     facecolor=LIGHT_AMBER, edgecolor=BORDER_AMBER, fontsize=9.5, bold=True, text_color=ACCENT_AMBER)
    
    # Bottom-Left: Faculty Auditor
    draw_rounded_box(ax, 0.10, 0.06, 0.22, 0.12, "E4: Faculty Auditor /\nTeacher",
                     facecolor=LIGHT_GREEN, edgecolor=BORDER_GREEN, fontsize=9.5, bold=True, text_color=ACCENT_GREEN)
    
    # Bottom-Right: Appwrite Cloud BaaS
    draw_rounded_box(ax, 0.68, 0.06, 0.24, 0.12, "E5: Appwrite Backend\n(Cloud DB & Storage)",
                     facecolor=LIGHT_GRAY, edgecolor=BORDER_GRAY, fontsize=9.5, bold=True, text_color=DARK_GRAY)
    
    # Arrows - Admin <-> System
    draw_arrow(ax, 0.45, 0.82, 0.45, 0.62, "Election Config, Nominees, Branding", rad=-0.08)
    draw_arrow(ax, 0.55, 0.62, 0.55, 0.82, "Audit Reports, Tally Analytics", rad=-0.08)
    
    # Arrows - Student <-> System
    draw_arrow(ax, 0.23, 0.52, 0.35, 0.52, "Student Credentials, Votes", rad=-0.05)
    draw_arrow(ax, 0.35, 0.46, 0.23, 0.46, "Ballot Slates, Vote Receipt, Certified Results", rad=-0.05)
    
    # Arrows - Offline Kiosk <-> System
    draw_arrow(ax, 0.65, 0.52, 0.77, 0.52, "Signed Offline Permit", rad=-0.05)
    draw_arrow(ax, 0.77, 0.46, 0.65, 0.46, "ECDH Encrypted Ballot Payload", rad=-0.05)
    
    # Arrows - Faculty Auditor <-> System
    draw_arrow(ax, 0.32, 0.14, 0.42, 0.38, "Tally & Audit Inquiries", rad=0.05)
    draw_arrow(ax, 0.44, 0.38, 0.30, 0.18, "Certified Outcome, Audit Trail", rad=0.05)
    
    # Arrows - Appwrite Backend <-> System
    draw_arrow(ax, 0.58, 0.38, 0.72, 0.18, "CRUD Ops, File Uploads", rad=-0.05)
    draw_arrow(ax, 0.76, 0.18, 0.62, 0.38, "Persisted Documents, Assets", rad=-0.05)
    
    plt.tight_layout()
    plt.savefig('diagram_context_dfd0.png', bbox_inches='tight', dpi=300)
    plt.close()
    print("Generated diagram_context_dfd0.png")

# ==============================================================================
# 3. DFD LEVEL 1 (SYSTEM LEVEL ARCHITECTURE)
# ==============================================================================
def generate_dfd1():
    fig, ax = plt.subplots(figsize=(13, 9), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    
    # External Entities
    draw_rounded_box(ax, 0.02, 0.78, 0.16, 0.12, "Administrator", LIGHT_PURPLE, BORDER_PURPLE, bold=True, text_color=PURPLE)
    draw_rounded_box(ax, 0.02, 0.38, 0.16, 0.12, "Student / Voter", LIGHT_BLUE, BORDER_BLUE, bold=True, text_color=NAVY)
    draw_rounded_box(ax, 0.02, 0.05, 0.16, 0.12, "Faculty Auditor", LIGHT_GREEN, BORDER_GREEN, bold=True, text_color=ACCENT_GREEN)
    
    # Level 1 Processes
    processes = [
        (0.26, 0.80, 0.18, 0.11, "1.0\nAuth & Access\nControl"),
        (0.26, 0.60, 0.18, 0.11, "2.0\nElection &\nScope Setup"),
        (0.26, 0.40, 0.18, 0.11, "3.0\nCandidacy &\nParty Filing"),
        (0.26, 0.20, 0.18, 0.11, "4.0\nBallot & Vote\nProcessing"),
        (0.56, 0.75, 0.18, 0.11, "5.0\nOffline Ballot\nIngestion"),
        (0.56, 0.45, 0.18, 0.11, "6.0\nVote Tallying\n& Analytics"),
        (0.56, 0.15, 0.18, 0.11, "7.0\nAudit Logging\n& Governance")
    ]
    
    for x, y, w, h, text in processes:
        draw_oval(ax, x, y, w, h, text, facecolor="white", edgecolor=BORDER_BLUE, fontsize=8.5, bold=True, text_color=DARK_GRAY)
        
    # Data Stores (Right Side)
    stores = [
        (0.82, 0.85, 0.16, 0.07, "D1: Users Store"),
        (0.82, 0.73, 0.16, 0.07, "D2: Elections Store"),
        (0.82, 0.61, 0.16, 0.07, "D3: Positions / Parties"),
        (0.82, 0.49, 0.16, 0.07, "D4: Candidates Store"),
        (0.82, 0.37, 0.16, 0.07, "D5: Votes Store"),
        (0.82, 0.25, 0.16, 0.07, "D6: Offline Ballots"),
        (0.82, 0.13, 0.16, 0.07, "D7: Audit Logs Store"),
        (0.82, 0.02, 0.16, 0.07, "D8: Branding Settings")
    ]
    for x, y, w, h, text in stores:
        draw_cylinder(ax, x, y, w, h, text, facecolor=LIGHT_GRAY, edgecolor=SLATE_BLUE, fontsize=7.5, bold=True)
        
    # Data Flows (Entity to Process)
    draw_arrow(ax, 0.18, 0.84, 0.26, 0.85, "Credentials", color=SLATE_BLUE)
    draw_arrow(ax, 0.18, 0.81, 0.26, 0.68, "Election Form", color=SLATE_BLUE)
    draw_arrow(ax, 0.18, 0.79, 0.26, 0.48, "Nominations", color=SLATE_BLUE)
    draw_arrow(ax, 0.18, 0.46, 0.26, 0.82, "Login", color=SLATE_BLUE)
    draw_arrow(ax, 0.18, 0.42, 0.26, 0.27, "Submit Ballot", color=SLATE_BLUE)
    draw_arrow(ax, 0.18, 0.11, 0.56, 0.48, "View Certified Results", color=SLATE_BLUE)
    
    # Process to Data Stores
    draw_arrow(ax, 0.44, 0.85, 0.82, 0.88, "Verify / Update", color=NAVY)
    draw_arrow(ax, 0.44, 0.65, 0.82, 0.76, "Persist Election Rules", color=NAVY)
    draw_arrow(ax, 0.44, 0.45, 0.82, 0.52, "Store Nominees", color=NAVY)
    draw_arrow(ax, 0.44, 0.25, 0.82, 0.40, "Write Effective Vote", color=NAVY)
    draw_arrow(ax, 0.74, 0.80, 0.82, 0.28, "Write Nonce / Ballot", color=NAVY)
    draw_arrow(ax, 0.82, 0.41, 0.74, 0.48, "Aggregate Count", color=NAVY)
    draw_arrow(ax, 0.65, 0.26, 0.82, 0.16, "Write Audit Event", color=NAVY)
    
    # Inter-process flows
    draw_arrow(ax, 0.35, 0.79, 0.35, 0.72, "Auth Token", rad=0.1)
    draw_arrow(ax, 0.35, 0.59, 0.35, 0.52, "Scope Rules", rad=0.1)
    draw_arrow(ax, 0.65, 0.74, 0.44, 0.28, "Decrypted Votes", rad=-0.2)
    
    plt.tight_layout()
    plt.savefig('diagram_dfd1.png', bbox_inches='tight', dpi=300)
    plt.close()
    print("Generated diagram_dfd1.png")

# ==============================================================================
# 4. DFD LEVEL 2 (SUBPROCESS 4.0: VOTE PROCESSING)
# ==============================================================================
def generate_dfd2():
    fig, ax = plt.subplots(figsize=(12, 8.5), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    
    # Header
    ax.text(0.50, 0.95, "DFD Level 2: Decomposition of Process 4.0 (Vote Processing)",
            ha='center', va='center', fontsize=12, weight='bold', color=NAVY)
    
    # External Entity
    draw_rounded_box(ax, 0.03, 0.50, 0.18, 0.14, "Student Voter\n(Active Session)",
                     LIGHT_BLUE, BORDER_BLUE, bold=True, text_color=NAVY)
    
    # Subprocesses
    subprocesses = [
        (0.28, 0.72, 0.22, 0.12, "4.1\nValidate Voter\nEligibility & Scope"),
        (0.28, 0.40, 0.22, 0.12, "4.2\nRetrieve Candidate\nSlates & Positions"),
        (0.58, 0.72, 0.22, 0.12, "4.3\nEnforce Choice Limits\n& Election Window"),
        (0.58, 0.40, 0.22, 0.12, "4.4\nComposite Key &\nDeduplication"),
        (0.58, 0.10, 0.22, 0.12, "4.5\nAtomic Vote Storage\n& Receipt Issuance")
    ]
    for x, y, w, h, text in subprocesses:
        draw_oval(ax, x, y, w, h, text, facecolor="white", edgecolor=BORDER_BLUE, fontsize=8, bold=True, text_color=DARK_GRAY)
        
    # Data Stores
    draw_cylinder(ax, 0.28, 0.10, 0.22, 0.08, "D2: Elections Store", LIGHT_GRAY, SLATE_BLUE, bold=True)
    draw_cylinder(ax, 0.86, 0.74, 0.12, 0.08, "D4: Candidates", LIGHT_GRAY, SLATE_BLUE, bold=True)
    draw_cylinder(ax, 0.86, 0.42, 0.12, 0.08, "D5: Votes Store", LIGHT_GRAY, SLATE_BLUE, bold=True)
    draw_cylinder(ax, 0.86, 0.12, 0.12, 0.08, "D7: Audit Logs", LIGHT_GRAY, SLATE_BLUE, bold=True)
    
    # Flows
    draw_arrow(ax, 0.21, 0.58, 0.28, 0.76, "User Profile & Token", color=SLATE_BLUE)
    draw_arrow(ax, 0.39, 0.72, 0.39, 0.53, "Eligible Scope Flag", color=SLATE_BLUE)
    draw_arrow(ax, 0.39, 0.18, 0.39, 0.40, "Read Scope & Window", color=NAVY)
    draw_arrow(ax, 0.50, 0.46, 0.21, 0.52, "Send Formatted Ballot", color=SLATE_BLUE)
    draw_arrow(ax, 0.21, 0.50, 0.58, 0.76, "Selected Candidate IDs", color=SLATE_BLUE, rad=0.2)
    draw_arrow(ax, 0.69, 0.72, 0.69, 0.53, "Validated Choices", color=SLATE_BLUE)
    draw_arrow(ax, 0.86, 0.78, 0.80, 0.78, "Candidate Validation", color=NAVY)
    draw_arrow(ax, 0.69, 0.40, 0.69, 0.23, "Deterministic Vote ID", color=SLATE_BLUE)
    draw_arrow(ax, 0.80, 0.46, 0.86, 0.46, "Unique Index Write", color=NAVY)
    draw_arrow(ax, 0.80, 0.16, 0.86, 0.16, "Log Vote Event", color=NAVY)
    draw_arrow(ax, 0.58, 0.16, 0.21, 0.48, "Cryptographic Receipt", color=ACCENT_GREEN, rad=-0.2)
    
    plt.tight_layout()
    plt.savefig('diagram_dfd2.png', bbox_inches='tight', dpi=300)
    plt.close()
    print("Generated diagram_dfd2.png")

# ==============================================================================
# 5. FLOWCHARTS (LEVEL 0, LEVEL 1, LEVEL 2)
# ==============================================================================
def generate_flowcharts():
    # Level 0 Flowchart: System Operational Lifecycle
    fig, ax = plt.subplots(figsize=(10, 8), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    ax.text(0.5, 0.96, "Flowchart Level 0: High-Level System Operational Lifecycle",
            ha='center', va='center', fontsize=12, weight='bold', color=NAVY)
    
    nodes_l0 = [
        (0.40, 0.88, 0.20, 0.05, "Start: System Init", "oval", LIGHT_PURPLE, BORDER_PURPLE),
        (0.35, 0.77, 0.30, 0.06, "1. Admin Configures Election\n& Scope Criteria", "box", "white", BORDER_BLUE),
        (0.35, 0.66, 0.30, 0.06, "2. Candidacy Nomination &\nParty-List Registration", "box", "white", BORDER_BLUE),
        (0.35, 0.55, 0.30, 0.06, "3. Snapshot Verification &\nPre-Election Integrity Audit", "box", "white", BORDER_BLUE),
        (0.35, 0.44, 0.30, 0.06, "4. Live Voting Phase\n(Online Portal + Offline Sync)", "box", LIGHT_GREEN, BORDER_GREEN),
        (0.35, 0.33, 0.30, 0.06, "5. Election Window Closes &\nPolls Finalized", "box", "white", BORDER_AMBER),
        (0.35, 0.22, 0.30, 0.06, "6. Automated Tallying &\nCertified Results Publication", "box", "white", BORDER_BLUE),
        (0.35, 0.11, 0.30, 0.06, "7. Post-Election Audit Log\nArchival & Reporting", "box", "white", BORDER_BLUE),
        (0.40, 0.02, 0.20, 0.05, "End: Election Concluded", "oval", LIGHT_PURPLE, BORDER_PURPLE)
    ]
    
    for x, y, w, h, text, shape, fc, ec in nodes_l0:
        if shape == "oval":
            draw_oval(ax, x, y, w, h, text, fc, ec, fontsize=8.5, bold=True)
        else:
            draw_rounded_box(ax, x, y, w, h, text, fc, ec, fontsize=8.5, bold=True)
            
    for i in range(len(nodes_l0) - 1):
        x1 = nodes_l0[i][0] + nodes_l0[i][2]/2
        y1 = nodes_l0[i][1]
        x2 = nodes_l0[i+1][0] + nodes_l0[i+1][2]/2
        y2 = nodes_l0[i+1][1] + nodes_l0[i+1][3]
        draw_arrow(ax, x1, y1, x2, y2, color=SLATE_BLUE)
        
    plt.tight_layout()
    plt.savefig('diagram_flowchart_lvl0.png', bbox_inches='tight', dpi=300)
    plt.close()
    print("Generated diagram_flowchart_lvl0.png")

    # Level 1 Flowchart: Voter Session & Ballot Casting
    fig, ax = plt.subplots(figsize=(11, 9), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    ax.text(0.5, 0.97, "Flowchart Level 1: Student Voter Authentication & Voting Workflow",
            ha='center', va='center', fontsize=12, weight='bold', color=NAVY)
    
    draw_oval(ax, 0.40, 0.90, 0.20, 0.045, "Start: Student Login", LIGHT_BLUE, BORDER_BLUE, bold=True)
    draw_rounded_box(ax, 0.35, 0.81, 0.30, 0.055, "Enter Student Number\n& Scrypt Password", "white", BORDER_BLUE)
    draw_diamond(ax, 0.38, 0.69, 0.24, 0.08, "Credentials\nValid?", "white", BORDER_AMBER)
    draw_diamond(ax, 0.38, 0.56, 0.24, 0.08, "Eligible for\nScope?", "white", BORDER_AMBER)
    draw_diamond(ax, 0.38, 0.43, 0.24, 0.08, "Already\nVoted?", "white", BORDER_AMBER)
    draw_rounded_box(ax, 0.35, 0.32, 0.30, 0.055, "Render Active Ballot\n(Positions & Nominees)", "white", BORDER_BLUE)
    draw_rounded_box(ax, 0.35, 0.22, 0.30, 0.055, "Select Candidates &\nConfirm Choices", "white", BORDER_BLUE)
    draw_rounded_box(ax, 0.35, 0.12, 0.30, 0.055, "Commit Vote to DB &\nGenerate Digital Receipt", LIGHT_GREEN, BORDER_GREEN, bold=True)
    draw_oval(ax, 0.40, 0.03, 0.20, 0.045, "End: Session Logged Out", LIGHT_BLUE, BORDER_BLUE, bold=True)
    
    # Error boxes on right
    draw_rounded_box(ax, 0.74, 0.70, 0.22, 0.06, "Display Auth Error\n& Increment Attempts", LIGHT_AMBER, BORDER_AMBER)
    draw_rounded_box(ax, 0.74, 0.57, 0.22, 0.06, "Display Scope Warning\n(Not Eligible)", LIGHT_AMBER, BORDER_AMBER)
    draw_rounded_box(ax, 0.74, 0.44, 0.22, 0.06, "Display Prior Receipt\n& Prevent Duplicate", LIGHT_AMBER, BORDER_AMBER)
    
    # Main down arrows
    draw_arrow(ax, 0.50, 0.90, 0.50, 0.865)
    draw_arrow(ax, 0.50, 0.81, 0.50, 0.77)
    draw_arrow(ax, 0.50, 0.69, 0.50, 0.64, "Yes")
    draw_arrow(ax, 0.50, 0.56, 0.50, 0.51, "Yes")
    draw_arrow(ax, 0.50, 0.43, 0.50, 0.375, "No")
    draw_arrow(ax, 0.50, 0.32, 0.50, 0.275)
    draw_arrow(ax, 0.50, 0.22, 0.50, 0.175)
    draw_arrow(ax, 0.50, 0.12, 0.50, 0.075)
    
    # Branch arrows
    draw_arrow(ax, 0.62, 0.73, 0.74, 0.73, "No")
    draw_arrow(ax, 0.62, 0.60, 0.74, 0.60, "No")
    draw_arrow(ax, 0.62, 0.47, 0.74, 0.47, "Yes")
    
    # Error loop back
    draw_arrow(ax, 0.85, 0.76, 0.65, 0.83, rad=0.2)
    
    plt.tight_layout()
    plt.savefig('diagram_flowchart_lvl1.png', bbox_inches='tight', dpi=300)
    plt.close()
    print("Generated diagram_flowchart_lvl1.png")

    # Level 2 Flowchart: Cryptographic Offline Ballot Ingestion
    fig, ax = plt.subplots(figsize=(12, 9.5), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    ax.text(0.5, 0.97, "Flowchart Level 2: Offline Voting Station & Cryptographic Import Protocol",
            ha='center', va='center', fontsize=12, weight='bold', color=NAVY)
    
    # Left: Station Generation
    ax.text(0.25, 0.92, "[ Air-Gapped Precinct Station ]", ha='center', va='center', fontsize=10, weight='bold', color=SLATE_BLUE)
    draw_rounded_box(ax, 0.10, 0.84, 0.30, 0.055, "1. Admin issues Offline Permit\n(HMAC-SHA256 Token)", "white", BORDER_BLUE)
    draw_rounded_box(ax, 0.10, 0.74, 0.30, 0.055, "2. Student casts offline vote;\nGenerates Nonce & Timestamp", "white", BORDER_BLUE)
    draw_rounded_box(ax, 0.10, 0.64, 0.30, 0.055, "3. Generate Ephemeral ECDH\nKeypair (prime256v1)", "white", BORDER_BLUE)
    draw_rounded_box(ax, 0.10, 0.54, 0.30, 0.055, "4. Derive Shared AES-256 Key\nvia HKDF-SHA256 with Salt", "white", BORDER_BLUE)
    draw_rounded_box(ax, 0.10, 0.44, 0.30, 0.055, "5. Encrypt Ballot payload using\nAES-256-GCM + Auth Tag", LIGHT_GREEN, BORDER_GREEN, bold=True)
    draw_rounded_box(ax, 0.10, 0.34, 0.30, 0.055, "6. Export Encrypted JSON\nEnvelope to Secure USB", "white", BORDER_AMBER)
    
    # Center Transfer Arrow
    draw_arrow(ax, 0.40, 0.36, 0.60, 0.84, "Physical Transport\n(Encrypted JSON)", color=ACCENT_AMBER, rad=0.1)
    
    # Right: Central Server Ingestion
    ax.text(0.75, 0.92, "[ Central Server Ingestion & Verification ]", ha='center', va='center', fontsize=10, weight='bold', color=NAVY)
    draw_rounded_box(ax, 0.60, 0.84, 0.30, 0.055, "7. Admin uploads Encrypted\nBallot Envelope to Server", "white", BORDER_BLUE)
    draw_diamond(ax, 0.63, 0.71, 0.24, 0.08, "Verify Nonce\nUnique?", "white", BORDER_AMBER)
    draw_diamond(ax, 0.63, 0.58, 0.24, 0.08, "Verify HMAC\nPermit Valid?", "white", BORDER_AMBER)
    draw_rounded_box(ax, 0.60, 0.47, 0.30, 0.055, "8. Compute Server ECDH Secret\n& Decrypt AES-256-GCM", "white", BORDER_BLUE)
    draw_diamond(ax, 0.63, 0.34, 0.24, 0.08, "Check GCM\nAuth Tag?", "white", BORDER_AMBER)
    draw_rounded_box(ax, 0.60, 0.22, 0.30, 0.055, "9. Atomic Batch Ingestion:\nPersist Votes & Mark Nonce", LIGHT_GREEN, BORDER_GREEN, bold=True)
    draw_rounded_box(ax, 0.60, 0.11, 0.30, 0.055, "10. Log Import Audit Event &\nUpdate Election Tallies", LIGHT_PURPLE, BORDER_PURPLE, bold=True)
    draw_oval(ax, 0.65, 0.02, 0.20, 0.045, "Success: Imported", LIGHT_BLUE, BORDER_BLUE, bold=True)
    
    # Connecting arrows Left
    draw_arrow(ax, 0.25, 0.84, 0.25, 0.795)
    draw_arrow(ax, 0.25, 0.74, 0.25, 0.695)
    draw_arrow(ax, 0.25, 0.64, 0.25, 0.595)
    draw_arrow(ax, 0.25, 0.54, 0.25, 0.495)
    draw_arrow(ax, 0.25, 0.44, 0.25, 0.395)
    
    # Connecting arrows Right
    draw_arrow(ax, 0.75, 0.84, 0.75, 0.79)
    draw_arrow(ax, 0.75, 0.71, 0.75, 0.66, "Yes")
    draw_arrow(ax, 0.75, 0.58, 0.75, 0.525, "Yes")
    draw_arrow(ax, 0.75, 0.47, 0.75, 0.42)
    draw_arrow(ax, 0.75, 0.34, 0.75, 0.275, "Valid")
    draw_arrow(ax, 0.75, 0.22, 0.75, 0.165)
    draw_arrow(ax, 0.75, 0.11, 0.75, 0.065)
    
    # Rejection exits
    draw_rounded_box(ax, 0.90, 0.50, 0.08, 0.20, "REJECT\nBALLOT\n& LOG\nALERT", LIGHT_AMBER, BORDER_AMBER, bold=True, text_color=ACCENT_AMBER)
    draw_arrow(ax, 0.87, 0.75, 0.90, 0.68, "Replay")
    draw_arrow(ax, 0.87, 0.62, 0.90, 0.60, "Expired")
    draw_arrow(ax, 0.87, 0.38, 0.90, 0.52, "Tampered")
    
    plt.tight_layout()
    plt.savefig('diagram_flowchart_lvl2.png', bbox_inches='tight', dpi=300)
    plt.close()
    print("Generated diagram_flowchart_lvl2.png")

# ==============================================================================
# 6. ENTITY RELATIONSHIP DIAGRAM (ERD)
# ==============================================================================
def generate_erd():
    fig, ax = plt.subplots(figsize=(14, 10), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    
    ax.text(0.50, 0.97, "Entity Relationship Diagram (ERD) - Appwrite Database Architecture",
            ha='center', va='center', fontsize=13, weight='bold', color=NAVY)
    
    # Entities to draw
    entities = [
        # (x, y, w, h, title, fields)
        (0.04, 0.62, 0.26, 0.30, "USERS (users)", [
            ("id [PK]", "string (doc ID)"),
            ("studentNumber [UQ]", "string (unique)"),
            ("fullName", "string"),
            ("password", "string (scrypt)"),
            ("role", "string (admin/teacher/student)"),
            ("yearLevel", "integer (1-12)"),
            ("section", "string"),
            ("room", "string"),
            ("hasSetPassword", "boolean"),
            ("photoUrl", "string")
        ]),
        (0.37, 0.62, 0.26, 0.30, "ELECTIONS (elections)", [
            ("id [PK]", "string (doc ID)"),
            ("title", "string"),
            ("description", "string"),
            ("startsAt", "string (ISO timestamp)"),
            ("endsAt", "string (ISO timestamp)"),
            ("scope", "string (all/grade/sec/room)"),
            ("scopeValue", "string"),
            ("hasPartyList", "boolean"),
            ("targetGradeLevel", "integer"),
            ("targetSection / Room", "string")
        ]),
        (0.70, 0.62, 0.26, 0.30, "POSITIONS (positions)", [
            ("id [PK]", "string (doc ID)"),
            ("electionId [FK]", "string -> ELECTIONS"),
            ("name", "string"),
            ("normalizedName [UQ]", "string (scoped unique)")
        ]),
        (0.04, 0.22, 0.26, 0.32, "CANDIDATES (candidates)", [
            ("id [PK]", "string (doc ID)"),
            ("electionId [FK]", "string -> ELECTIONS"),
            ("positionId [FK]", "string -> POSITIONS"),
            ("userId [FK]", "string -> USERS"),
            ("partyListId [FK]", "string -> PARTY_LISTS"),
            ("fullName", "string"),
            ("party", "string"),
            ("manifesto", "string (long text)"),
            ("photoUrl", "string"),
            ("voteCount", "integer")
        ]),
        (0.37, 0.22, 0.26, 0.32, "VOTES (votes)", [
            ("id [PK]", "string (doc ID)"),
            ("electionId [FK]", "string -> ELECTIONS"),
            ("positionId [FK]", "string -> POSITIONS"),
            ("candidateId [FK]", "string -> CANDIDATES"),
            ("voterId [FK]", "string -> USERS"),
            ("userId", "string"),
            ("timestamp", "string (ISO timestamp)"),
            ("isOfflineImport", "boolean"),
            ("UQ: (electionId, positionId, voterId)", "Composite Unique")
        ]),
        (0.70, 0.22, 0.26, 0.32, "PARTY_LISTS (partyLists)", [
            ("id [PK]", "string (doc ID)"),
            ("electionId [FK]", "string -> ELECTIONS"),
            ("name", "string"),
            ("normalizedName [UQ]", "string (scoped unique)"),
            ("acronym", "string"),
            ("logoUrl", "string"),
            ("advocacy", "string")
        ]),
        (0.04, 0.03, 0.26, 0.14, "AUDIT_LOGS (auditLogs)", [
            ("id [PK]", "string"),
            ("action", "string"),
            ("performedBy / Role", "string"),
            ("timestamp", "string (desc index)"),
            ("details", "string")
        ]),
        (0.37, 0.03, 0.26, 0.14, "OFFLINE_BALLOTS (offlineBallots)", [
            ("id [PK]", "string"),
            ("nonce [UQ]", "string (cryptographic unique)"),
            ("voterId [FK]", "string -> USERS"),
            ("electionId [FK]", "string -> ELECTIONS"),
            ("importedAt / By", "string")
        ]),
        (0.70, 0.03, 0.26, 0.14, "BRANDING (branding)", [
            ("id [PK]", "string ('school')"),
            ("schoolName", "string"),
            ("tagline", "string"),
            ("logoUrl", "string"),
            ("primaryColor / Attrib", "string")
        ])
    ]
    
    for x, y, w, h, title, fields in entities:
        # Header box
        h_box = patches.Rectangle((x, y + h - 0.04), w, 0.04, facecolor=NAVY, edgecolor=NAVY, zorder=2)
        ax.add_patch(h_box)
        ax.text(x + w/2, y + h - 0.02, title, ha='center', va='center', fontsize=8, weight='bold', color='white', zorder=3)
        # Body box
        b_box = patches.Rectangle((x, y), w, h - 0.04, facecolor="white", edgecolor=BORDER_BLUE, linewidth=1.2, zorder=1)
        ax.add_patch(b_box)
        # Text fields
        num_fields = len(fields)
        row_h = (h - 0.045) / max(num_fields, 1)
        for i, (fn, ft) in enumerate(fields):
            row_y = y + h - 0.045 - (i + 0.5) * row_h
            bold = "[PK]" in fn or "[FK]" in fn or "[UQ]" in fn
            color = NAVY if bold else DARK_GRAY
            ax.text(x + 0.01, row_y, fn, ha='left', va='center', fontsize=6.8, weight='bold' if bold else 'normal', color=color, zorder=3)
            ax.text(x + w - 0.01, row_y, ft, ha='right', va='center', fontsize=6.5, color=MID_GRAY, zorder=3)
            
    # Draw Relationship Connectors
    # USERS -> CANDIDATES (1:M)
    draw_arrow(ax, 0.17, 0.62, 0.17, 0.54, "1 : M (Nomination)", color=BORDER_BLUE, fontsize=7)
    # USERS -> VOTES (1:M)
    draw_arrow(ax, 0.20, 0.62, 0.40, 0.54, "1 : M (Ballot Cast)", color=BORDER_BLUE, rad=0.1, fontsize=7)
    # ELECTIONS -> POSITIONS (1:M)
    draw_arrow(ax, 0.63, 0.77, 0.70, 0.77, "1 : M", color=NAVY, fontsize=7)
    # ELECTIONS -> CANDIDATES (1:M)
    draw_arrow(ax, 0.42, 0.62, 0.26, 0.54, "1 : M", color=NAVY, rad=-0.1, fontsize=7)
    # ELECTIONS -> VOTES (1:M)
    draw_arrow(ax, 0.50, 0.62, 0.50, 0.54, "1 : M", color=NAVY, fontsize=7)
    # POSITIONS -> CANDIDATES (1:M)
    draw_arrow(ax, 0.75, 0.62, 0.28, 0.52, "1 : M", color=BORDER_PURPLE, rad=-0.15, fontsize=7)
    # PARTY_LISTS -> CANDIDATES (1:M)
    draw_arrow(ax, 0.70, 0.38, 0.30, 0.38, "1 : M (Affiliation)", color=BORDER_AMBER, fontsize=7)
    # CANDIDATES -> VOTES (1:M)
    draw_arrow(ax, 0.30, 0.30, 0.37, 0.30, "1 : M (Tally)", color=ACCENT_GREEN, fontsize=7)
    
    plt.tight_layout()
    plt.savefig('diagram_erd.png', bbox_inches='tight', dpi=300)
    plt.close()
    print("Generated diagram_erd.png")

if __name__ == '__main__':
    generate_usecase()
    generate_context_diagram()
    generate_dfd1()
    generate_dfd2()
    generate_flowcharts()
    generate_erd()
