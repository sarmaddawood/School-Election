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

def draw_rounded_box(ax, x, y, w, h, text, facecolor, edgecolor, fontsize=8.5, bold=False, text_color=DARK_GRAY, radius=0.025):
    box = FancyBboxPatch((x, y), w, h,
                         boxstyle=f"round,pad={radius},rounding_size={radius}",
                         facecolor=facecolor, edgecolor=edgecolor, linewidth=1.5, zorder=2)
    ax.add_patch(box)
    weight = 'bold' if bold else 'normal'
    ax.text(x + w/2, y + h/2, text, ha='center', va='center', fontsize=fontsize,
            weight=weight, color=text_color, zorder=3, wrap=True)

def draw_oval(ax, x, y, w, h, text, facecolor, edgecolor, fontsize=8.5, bold=False, text_color=DARK_GRAY):
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

def draw_cylinder(ax, x, y, w, h, text, facecolor, edgecolor, fontsize=7.5, bold=False, text_color=DARK_GRAY):
    box = patches.Rectangle((x, y), w, h, facecolor=facecolor, edgecolor=edgecolor, linewidth=1.4, zorder=2)
    ax.add_patch(box)
    ax.plot([x, x+w], [y+h, y+h], color=edgecolor, linewidth=1.8, zorder=3)
    ax.plot([x, x+w], [y, y], color=edgecolor, linewidth=1.8, zorder=3)
    ax.plot([x+0.18*w, x+0.18*w], [y, y+h], color=edgecolor, linewidth=1, linestyle='--', zorder=3)
    weight = 'bold' if bold else 'normal'
    ax.text(x + 0.58*w, y + h/2, text, ha='center', va='center', fontsize=fontsize,
            weight=weight, color=text_color, zorder=4)

def draw_arrow(ax, x1, y1, x2, y2, label="", rad=0.0, color=SLATE_BLUE, fontsize=7.5):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="->,head_width=0.32,head_length=0.42",
                                color=color, lw=1.3,
                                connectionstyle=f"arc3,rad={rad}"), zorder=1)
    if label:
        mid_x = (x1 + x2) / 2
        mid_y = (y1 + y2) / 2
        offset_y = 0.022 if rad >= 0 else -0.025
        ax.text(mid_x, mid_y + offset_y, label, ha='center', va='center',
                fontsize=fontsize, color=DARK_GRAY,
                bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none", alpha=0.9), zorder=4)

def draw_stickman(ax, cx, cy, title, subtitle="", color=NAVY, scale=1.0, fontsize=8.5, fig_w=12.0, fig_h=8.5):
    """Draws a crisp, standard UML stick figure actor with text label."""
    aspect = fig_h / fig_w
    r_y = 0.024 * scale
    r_x = r_y * aspect
    
    # Head
    head_cy = cy + 0.055 * scale
    head = patches.Ellipse((cx, head_cy), width=2*r_x, height=2*r_y,
                           facecolor="#FFFFFF", edgecolor=color, linewidth=2.5, zorder=5)
    ax.add_patch(head)
    
    # Neck & Torso
    neck_y = head_cy - r_y
    hip_y = cy - 0.015 * scale
    ax.plot([cx, cx], [neck_y, hip_y], color=color, linewidth=2.5, solid_capstyle='round', zorder=4)
    
    # Arms
    shoulder_y = neck_y - 0.012 * scale
    arm_span_x = 0.032 * scale * aspect
    arm_drop_y = 0.028 * scale
    ax.plot([cx, cx - arm_span_x], [shoulder_y, shoulder_y - arm_drop_y], color=color, linewidth=2.3, solid_capstyle='round', zorder=4)
    ax.plot([cx, cx + arm_span_x], [shoulder_y, shoulder_y - arm_drop_y], color=color, linewidth=2.3, solid_capstyle='round', zorder=4)
    
    # Legs
    leg_span_x = 0.026 * scale * aspect
    leg_drop_y = 0.045 * scale
    feet_y = hip_y - leg_drop_y
    ax.plot([cx, cx - leg_span_x], [hip_y, feet_y], color=color, linewidth=2.3, solid_capstyle='round', zorder=4)
    ax.plot([cx, cx + leg_span_x], [hip_y, feet_y], color=color, linewidth=2.3, solid_capstyle='round', zorder=4)
    
    # Text label below feet
    text_y = feet_y - 0.016
    ax.text(cx, text_y, title, ha='center', va='top', fontsize=fontsize, weight='bold', color=color, zorder=5)
    if subtitle:
        ax.text(cx, text_y - 0.028, subtitle, ha='center', va='top', fontsize=fontsize - 1.5, weight='normal', color=DARK_GRAY, zorder=5)

# ==============================================================================
# 1. USE CASE DIAGRAM
# ==============================================================================
def generate_usecase():
    fig_w, fig_h = 12.0, 8.5
    fig, ax = plt.subplots(figsize=(fig_w, fig_h), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    
    # Boundary box
    system_box = FancyBboxPatch((0.26, 0.04), 0.48, 0.92, boxstyle="round,pad=0.02,rounding_size=0.02",
                                facecolor="#FAFCFF", edgecolor=NAVY, linewidth=2, zorder=0)
    ax.add_patch(system_box)
    ax.text(0.50, 0.93, "School Election System Boundary", ha='center', va='center',
            fontsize=13, weight='bold', color=NAVY)
    
    # Stickman Actors (Left & Right)
    # Admin (Top-Left)
    draw_stickman(ax, 0.12, 0.73, "Administrator", "(System Admin)", color=PURPLE, scale=1.05, fontsize=9, fig_w=fig_w, fig_h=fig_h)
    
    # Teacher / Auditor (Bottom-Left)
    draw_stickman(ax, 0.12, 0.27, "Teacher / Auditor", "(Faculty Observer)", color=ACCENT_GREEN, scale=1.05, fontsize=9, fig_w=fig_w, fig_h=fig_h)
    
    # Student Voter (Top-Right)
    draw_stickman(ax, 0.88, 0.73, "Student Voter", "(Eligible Student)", color=NAVY, scale=1.05, fontsize=9, fig_w=fig_w, fig_h=fig_h)
    
    # Candidate (Bottom-Right)
    draw_stickman(ax, 0.88, 0.27, "Candidate", "(Nominated Student)", color=ACCENT_AMBER, scale=1.05, fontsize=9, fig_w=fig_w, fig_h=fig_h)
    
    # Use cases inside system
    uc_list = [
        (0.30, 0.835, 0.40, 0.062, "UC1: Configure Election & Scope (Grade/Sec/Room)"),
        (0.30, 0.745, 0.40, 0.062, "UC2: Manage Positions & Party-Lists"),
        (0.30, 0.655, 0.40, 0.062, "UC3: Register Candidates & Validate Eligibility"),
        (0.30, 0.565, 0.40, 0.062, "UC4: Authenticate User (Scrypt / HMAC Token)"),
        (0.30, 0.475, 0.40, 0.062, "UC5: Cast Ballot Online (Enforce Single/Duplicate Rule)"),
        (0.30, 0.385, 0.40, 0.062, "UC6: Batch Import Student Roster (DepEd SF1)"),
        (0.30, 0.295, 0.40, 0.062, "UC7: Monitor Real-time Tallies & Participation"),
        (0.30, 0.205, 0.40, 0.062, "UC8: View Certified Results (Post-Election Phase)"),
        (0.30, 0.115, 0.40, 0.062, "UC9: Review System Audit Logs & Tamper Trails")
    ]
    
    for x, y, w, h, text in uc_list:
        draw_oval(ax, x, y, w, h, text, facecolor="white", edgecolor=BORDER_BLUE, fontsize=8.5, bold=False, text_color=DARK_GRAY)
    
    # Connections for Admin (starts from right side of admin stickman ~ x=0.17)
    draw_arrow(ax, 0.17, 0.76, 0.30, 0.865, color=BORDER_PURPLE) # to UC1
    draw_arrow(ax, 0.17, 0.74, 0.30, 0.775, color=BORDER_PURPLE) # to UC2
    draw_arrow(ax, 0.17, 0.72, 0.30, 0.685, color=BORDER_PURPLE) # to UC3
    draw_arrow(ax, 0.17, 0.70, 0.30, 0.595, color=BORDER_PURPLE) # to UC4
    draw_arrow(ax, 0.17, 0.68, 0.30, 0.415, color=BORDER_PURPLE) # to UC6 (SF1 import)
    draw_arrow(ax, 0.17, 0.66, 0.30, 0.325, color=BORDER_PURPLE) # to UC7
    draw_arrow(ax, 0.17, 0.64, 0.30, 0.145, color=BORDER_PURPLE) # to UC9
    
    # Connections for Teacher (starts from right side of teacher stickman ~ x=0.17)
    draw_arrow(ax, 0.17, 0.30, 0.30, 0.595, color=BORDER_GREEN) # to UC4 (Auth)
    draw_arrow(ax, 0.17, 0.28, 0.30, 0.325, color=BORDER_GREEN) # to UC7 (Monitor)
    draw_arrow(ax, 0.17, 0.26, 0.30, 0.235, color=BORDER_GREEN) # to UC8 (Results)
    draw_arrow(ax, 0.17, 0.24, 0.30, 0.145, color=BORDER_GREEN) # to UC9 (Audit)
    
    # Connections for Student Voter (starts from left side of student stickman ~ x=0.83)
    draw_arrow(ax, 0.83, 0.75, 0.70, 0.595, color=BORDER_BLUE) # to UC4 (Auth)
    draw_arrow(ax, 0.83, 0.72, 0.70, 0.505, color=BORDER_BLUE) # to UC5 (Cast Ballot)
    draw_arrow(ax, 0.83, 0.69, 0.70, 0.235, color=BORDER_BLUE) # to UC8 (Certified Results)
    
    # Connections for Candidate (starts from left side of candidate stickman ~ x=0.83)
    draw_arrow(ax, 0.83, 0.32, 0.70, 0.685, color=BORDER_AMBER) # to UC3 (Register/Eligible)
    draw_arrow(ax, 0.83, 0.29, 0.70, 0.595, color=BORDER_AMBER) # to UC4 (Auth)
    draw_arrow(ax, 0.83, 0.26, 0.70, 0.235, color=BORDER_AMBER) # to UC8 (Results)
    
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
    draw_oval(ax, 0.35, 0.37, 0.30, 0.24, "0.0\nBolinao School\nElection System\n(Core Web Engine)",
              facecolor=LIGHT_BLUE, edgecolor=NAVY, fontsize=10.5, bold=True, text_color=NAVY)
    
    # External Entities
    # Top: Administrator
    draw_rounded_box(ax, 0.38, 0.82, 0.24, 0.12, "E1: Election Administrator\n(System Admin)",
                     facecolor=LIGHT_PURPLE, edgecolor=BORDER_PURPLE, fontsize=9, bold=True, text_color=PURPLE)
    
    # Left: Student Voter
    draw_rounded_box(ax, 0.02, 0.41, 0.20, 0.16, "E2: Student Voter\n(Web Portal Client)",
                     facecolor=LIGHT_BLUE, edgecolor=BORDER_BLUE, fontsize=9, bold=True, text_color=NAVY)
    
    # Right: DepEd SF1 Masterlist (Replaces Offline Station)
    draw_rounded_box(ax, 0.78, 0.41, 0.20, 0.16, "E3: DepEd SF1 Masterlist\n(Official Excel Rosters)",
                     facecolor=LIGHT_AMBER, edgecolor=BORDER_AMBER, fontsize=9, bold=True, text_color=ACCENT_AMBER)
    
    # Bottom-Left: Faculty Auditor
    draw_rounded_box(ax, 0.06, 0.05, 0.24, 0.13, "E4: Faculty Auditor /\nTeacher",
                     facecolor=LIGHT_GREEN, edgecolor=BORDER_GREEN, fontsize=9, bold=True, text_color=ACCENT_GREEN)
    
    # Bottom-Right: Appwrite Cloud BaaS
    draw_rounded_box(ax, 0.70, 0.05, 0.24, 0.13, "E5: Appwrite Backend\n(Cloud DB & Storage)",
                     facecolor=LIGHT_GRAY, edgecolor=BORDER_GRAY, fontsize=9, bold=True, text_color=DARK_GRAY)
    
    # Arrows - Admin <-> System
    draw_arrow(ax, 0.44, 0.82, 0.44, 0.61, "Election Config & Scope", rad=0.0)
    draw_arrow(ax, 0.56, 0.61, 0.56, 0.82, "Audit Ledger & Tallies", rad=0.0)
    
    # Arrows - Student <-> System
    draw_arrow(ax, 0.22, 0.51, 0.35, 0.51, "LRN, Scrypt Password, Votes", rad=0.0)
    draw_arrow(ax, 0.35, 0.45, 0.22, 0.45, "Ballot, Receipt, Certified Results", rad=0.0)
    
    # Arrows - DepEd SF1 Masterlist <-> System
    draw_arrow(ax, 0.78, 0.51, 0.65, 0.51, "SF1 Spreadsheets (.xls/.xlsx)", rad=0.0)
    draw_arrow(ax, 0.65, 0.45, 0.78, 0.45, "Batch Roster Sync Summary", rad=0.0)
    
    # Arrows - Faculty Auditor <-> System
    draw_arrow(ax, 0.26, 0.18, 0.39, 0.38, "Turnout & Audit Inquiries", rad=0.04)
    draw_arrow(ax, 0.45, 0.37, 0.30, 0.15, "Certified Outcomes & Audit Log", rad=0.04)
    
    # Arrows - Appwrite Backend <-> System
    draw_arrow(ax, 0.57, 0.37, 0.72, 0.18, "CRUD Ops & Scoped Queries", rad=-0.04)
    draw_arrow(ax, 0.76, 0.18, 0.63, 0.37, "Persisted Docs & Storage Assets", rad=-0.04)
    
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
        (0.25, 0.80, 0.18, 0.11, "1.0\nAuth & Access\nControl"),
        (0.25, 0.60, 0.18, 0.11, "2.0\nElection & Scope\nSetup (Live Editing)"),
        (0.25, 0.40, 0.18, 0.11, "3.0\nCandidacy &\nParty Filing"),
        (0.25, 0.20, 0.18, 0.11, "4.0\nBallot & Vote\nProcessing"),
        (0.53, 0.72, 0.18, 0.11, "5.0\nStudent Roster &\nSF1 Batch Import"),
        (0.53, 0.45, 0.18, 0.11, "6.0\nVote Tallying\n& Analytics"),
        (0.53, 0.18, 0.18, 0.11, "7.0\nAudit Logging\n& Governance")
    ]
    
    for x, y, w, h, text in processes:
        draw_oval(ax, x, y, w, h, text, facecolor="white", edgecolor=BORDER_BLUE, fontsize=8.5, bold=True, text_color=DARK_GRAY)
        
    # Data Stores (Right Side: 8 collections, no offlineBallots)
    stores = [
        (0.82, 0.86, 0.16, 0.065, "D1: Users Store"),
        (0.82, 0.74, 0.16, 0.065, "D2: Elections Store"),
        (0.82, 0.62, 0.16, 0.065, "D3: Positions Store"),
        (0.82, 0.50, 0.16, 0.065, "D4: Candidates Store"),
        (0.82, 0.38, 0.16, 0.065, "D5: Votes Store"),
        (0.82, 0.26, 0.16, 0.065, "D6: PartyLists Store"),
        (0.82, 0.14, 0.16, 0.065, "D7: Audit Logs Store"),
        (0.82, 0.02, 0.16, 0.065, "D8: Branding Settings")
    ]
    for x, y, w, h, text in stores:
        draw_cylinder(ax, x, y, w, h, text, facecolor=LIGHT_GRAY, edgecolor=SLATE_BLUE, fontsize=7.5, bold=True)
        
    # Data Flows (Entity to Process)
    draw_arrow(ax, 0.18, 0.85, 0.25, 0.85, "Credentials", color=SLATE_BLUE)
    draw_arrow(ax, 0.18, 0.81, 0.25, 0.67, "Election Rules", color=SLATE_BLUE)
    draw_arrow(ax, 0.18, 0.78, 0.25, 0.47, "Nominations", color=SLATE_BLUE)
    draw_arrow(ax, 0.18, 0.88, 0.53, 0.79, "SF1 Spreadsheets", color=SLATE_BLUE, rad=0.12)
    draw_arrow(ax, 0.18, 0.46, 0.25, 0.82, "Login / LRN", color=SLATE_BLUE, rad=-0.08)
    draw_arrow(ax, 0.18, 0.42, 0.25, 0.27, "Submit Ballot", color=SLATE_BLUE)
    draw_arrow(ax, 0.18, 0.11, 0.53, 0.48, "View Certified Results", color=SLATE_BLUE, rad=0.08)
    
    # Process to Data Stores
    draw_arrow(ax, 0.43, 0.85, 0.82, 0.89, "Verify / Update", color=NAVY)
    draw_arrow(ax, 0.43, 0.65, 0.82, 0.77, "Persist Scope Rules", color=NAVY)
    draw_arrow(ax, 0.43, 0.45, 0.82, 0.53, "Store Candidates", color=NAVY)
    draw_arrow(ax, 0.43, 0.25, 0.82, 0.41, "Write Effective Vote", color=NAVY)
    draw_arrow(ax, 0.71, 0.77, 0.82, 0.87, "Batch Upsert Students", color=NAVY)
    draw_arrow(ax, 0.82, 0.42, 0.71, 0.48, "Aggregate Count", color=NAVY)
    draw_arrow(ax, 0.71, 0.22, 0.82, 0.17, "Write Audit Event", color=NAVY)
    
    # Inter-process flows
    draw_arrow(ax, 0.34, 0.79, 0.34, 0.72, "Auth Token", rad=0.08)
    draw_arrow(ax, 0.34, 0.59, 0.34, 0.52, "Scope Rules", rad=0.08)
    
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
    fig, ax = plt.subplots(figsize=(10, 9), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    ax.text(0.5, 0.975, "Flowchart Level 0: High-Level System Operational Lifecycle",
            ha='center', va='center', fontsize=12, weight='bold', color=NAVY)
    
    nodes_l0 = [
        (0.40, 0.91, 0.20, 0.042, "Start: System Init", "oval", LIGHT_PURPLE, BORDER_PURPLE),
        (0.32, 0.81, 0.36, 0.058, "1. Admin Configures Election\n& Scope Criteria (Grade/Sec/Room)", "box", "white", BORDER_BLUE),
        (0.32, 0.71, 0.36, 0.058, "2. Student Enrollment via\nDepEd SF1 Bulk Ingestion", "box", "white", BORDER_BLUE),
        (0.32, 0.61, 0.36, 0.058, "3. Candidacy Nomination &\nParty-List Registration", "box", "white", BORDER_BLUE),
        (0.32, 0.51, 0.36, 0.058, "4. Pre-Election Snapshot Audit\n& Integrity Verification", "box", "white", BORDER_BLUE),
        (0.32, 0.41, 0.36, 0.058, "5. Live Voting Phase\n(Online Portal + Scoped Ballots)", "box", LIGHT_GREEN, BORDER_GREEN),
        (0.32, 0.31, 0.36, 0.058, "6. Election Window Closes &\nAutomated Tallying", "box", "white", BORDER_AMBER),
        (0.32, 0.21, 0.36, 0.058, "7. Certified Results Publication\n& Winner Declaration", "box", "white", BORDER_BLUE),
        (0.32, 0.11, 0.36, 0.058, "8. Audit Ledger Archival &\nIntegrity Log Certification", "box", "white", BORDER_BLUE),
        (0.40, 0.025, 0.20, 0.042, "End: Election Concluded", "oval", LIGHT_PURPLE, BORDER_PURPLE)
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
    fig, ax = plt.subplots(figsize=(11, 9.5), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    ax.text(0.5, 0.975, "Flowchart Level 1: Student Voter Authentication & Voting Workflow",
            ha='center', va='center', fontsize=12, weight='bold', color=NAVY)
    
    draw_oval(ax, 0.40, 0.91, 0.20, 0.042, "Start: Student Login", LIGHT_BLUE, BORDER_BLUE, bold=True)
    draw_rounded_box(ax, 0.35, 0.82, 0.30, 0.055, "Enter Student Number (LRN)\n& Scrypt Password", "white", BORDER_BLUE)
    draw_diamond(ax, 0.38, 0.70, 0.24, 0.075, "Credentials\nValid?", "white", BORDER_AMBER)
    draw_diamond(ax, 0.38, 0.57, 0.24, 0.075, "First-Time\nUser Setup?", "white", BORDER_AMBER)
    draw_diamond(ax, 0.38, 0.44, 0.24, 0.075, "Eligible for\nScope?", "white", BORDER_AMBER)
    draw_diamond(ax, 0.38, 0.31, 0.24, 0.075, "Already\nVoted?", "white", BORDER_AMBER)
    draw_rounded_box(ax, 0.35, 0.205, 0.30, 0.055, "Render Active Scoped Ballot\n(Positions & Nominees)", "white", BORDER_BLUE)
    draw_rounded_box(ax, 0.35, 0.105, 0.30, 0.055, "Commit Vote to DB &\nGenerate Digital Receipt", LIGHT_GREEN, BORDER_GREEN, bold=True)
    draw_oval(ax, 0.40, 0.02, 0.20, 0.042, "End: Session Logged Out", LIGHT_BLUE, BORDER_BLUE, bold=True)
    
    # Side branch boxes
    draw_rounded_box(ax, 0.74, 0.71, 0.22, 0.055, "Display Auth Error\n& Increment Attempts", LIGHT_AMBER, BORDER_AMBER)
    draw_rounded_box(ax, 0.74, 0.58, 0.22, 0.055, "Prompt First-Time Password\nSetup (Min 6 Chars)", LIGHT_PURPLE, BORDER_PURPLE)
    draw_rounded_box(ax, 0.74, 0.45, 0.22, 0.055, "Display Scope Warning\n(Not Eligible for Race)", LIGHT_AMBER, BORDER_AMBER)
    draw_rounded_box(ax, 0.74, 0.32, 0.22, 0.055, "Display Prior Receipt\n& Prevent Duplicate", LIGHT_AMBER, BORDER_AMBER)
    
    # Main down arrows
    draw_arrow(ax, 0.50, 0.91, 0.50, 0.875)
    draw_arrow(ax, 0.50, 0.82, 0.50, 0.78)
    draw_arrow(ax, 0.50, 0.70, 0.50, 0.65, "Yes")
    draw_arrow(ax, 0.50, 0.57, 0.50, 0.52, "No")
    draw_arrow(ax, 0.50, 0.44, 0.50, 0.39, "Yes")
    draw_arrow(ax, 0.50, 0.31, 0.50, 0.265, "No")
    draw_arrow(ax, 0.50, 0.205, 0.50, 0.165)
    draw_arrow(ax, 0.50, 0.105, 0.50, 0.065)
    
    # Branch arrows
    draw_arrow(ax, 0.62, 0.738, 0.74, 0.738, "No")
    draw_arrow(ax, 0.62, 0.608, 0.74, 0.608, "Yes")
    draw_arrow(ax, 0.74, 0.58, 0.62, 0.53, "Saved", rad=0.2)
    draw_arrow(ax, 0.62, 0.478, 0.74, 0.478, "No")
    draw_arrow(ax, 0.62, 0.348, 0.74, 0.348, "Yes")
    
    plt.tight_layout()
    plt.savefig('diagram_flowchart_lvl1.png', bbox_inches='tight', dpi=300)
    plt.close()
    print("Generated diagram_flowchart_lvl1.png")

    # Level 2 Flowchart: DepEd SF1 Ingestion & Automated Provisioning Pipeline
    fig, ax = plt.subplots(figsize=(12, 9.5), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    ax.text(0.5, 0.975, "Flowchart Level 2: DepEd SF1 Masterlist Ingestion & Scrypt Provisioning Pipeline",
            ha='center', va='center', fontsize=12, weight='bold', color=NAVY)
    
    # Left Column: SF1 Ingestion & Parsing Engine
    ax.text(0.25, 0.93, "[ DepEd SF1 Parsing & Validation Engine ]", ha='center', va='center', fontsize=10, weight='bold', color=SLATE_BLUE)
    draw_rounded_box(ax, 0.10, 0.85, 0.30, 0.055, "1. Admin uploads DepEd SF1\nWorkbook (.xls / .xlsx)", "white", BORDER_BLUE)
    draw_rounded_box(ax, 0.10, 0.73, 0.30, 0.055, "2. Server parses workbook structure\nvia SheetJS (XLSX)", "white", BORDER_BLUE)
    draw_diamond(ax, 0.13, 0.59, 0.24, 0.08, "Validate SF1\nHeaders & Scope?", "white", BORDER_AMBER)
    draw_rounded_box(ax, 0.10, 0.47, 0.30, 0.055, "3. Extract Grade, Section &\nVoting Room identifiers", "white", BORDER_BLUE)
    draw_rounded_box(ax, 0.10, 0.35, 0.30, 0.055, "4. Iterate Student Rows:\nValidate 12-digit numeric LRN", "white", BORDER_BLUE)
    draw_diamond(ax, 0.13, 0.21, 0.24, 0.08, "LRN Valid &\nNon-Empty?", "white", BORDER_AMBER)
    draw_rounded_box(ax, 0.10, 0.09, 0.30, 0.055, "5. Extract 15+ DepEd Demographics\n(Name, Sex, Birth Date, Address)", LIGHT_GREEN, BORDER_GREEN, bold=True)
    
    # Connecting arrows Left Column
    draw_arrow(ax, 0.25, 0.85, 0.25, 0.79)
    draw_arrow(ax, 0.25, 0.73, 0.25, 0.675)
    draw_arrow(ax, 0.25, 0.59, 0.25, 0.53, "Yes")
    draw_arrow(ax, 0.25, 0.47, 0.25, 0.41)
    draw_arrow(ax, 0.25, 0.35, 0.25, 0.295)
    draw_arrow(ax, 0.25, 0.21, 0.25, 0.15, "Yes")
    
    # Rejection boxes (placed in between)
    draw_rounded_box(ax, 0.41, 0.60, 0.12, 0.06, "Reject File:\nInvalid SF1", LIGHT_AMBER, BORDER_AMBER)
    draw_arrow(ax, 0.37, 0.63, 0.41, 0.63, "No")
    draw_rounded_box(ax, 0.41, 0.22, 0.12, 0.06, "Skip Row:\nBad LRN", LIGHT_AMBER, BORDER_AMBER)
    draw_arrow(ax, 0.37, 0.25, 0.41, 0.25, "No")
    
    # Transfer arrow from Step 5 to Step 6
    draw_arrow(ax, 0.40, 0.11, 0.58, 0.85, "Validated Student Row", color=NAVY, rad=-0.2)
    
    # Right Column: Credential Derivation & Database Persistence
    ax.text(0.75, 0.93, "[ Identity Derivation & Database Sync ]", ha='center', va='center', fontsize=10, weight='bold', color=NAVY)
    draw_rounded_box(ax, 0.60, 0.85, 0.30, 0.055, "6. Check Existing Student in DB\nby normalized Student Number", "white", BORDER_BLUE)
    draw_diamond(ax, 0.63, 0.71, 0.24, 0.08, "User Already\nExists?", "white", BORDER_AMBER)
    draw_rounded_box(ax, 0.60, 0.59, 0.30, 0.055, "7a. Generate Deterministic ID\nu_{sha256(LRN)} & Set Flag", LIGHT_PURPLE, BORDER_PURPLE)
    draw_rounded_box(ax, 0.60, 0.47, 0.30, 0.055, "7b. Update Academic Section,\nRoom & Demographic Record", "white", BORDER_BLUE)
    draw_rounded_box(ax, 0.60, 0.35, 0.30, 0.055, "8. Atomic Batch Write to\nAppwrite Users Collection", LIGHT_GREEN, BORDER_GREEN, bold=True)
    draw_rounded_box(ax, 0.60, 0.23, 0.30, 0.055, "9. Append Audit Log Entry\n('USER_BULK_IMPORT')", "white", BORDER_BLUE)
    draw_rounded_box(ax, 0.60, 0.12, 0.30, 0.055, "10. Return Ingestion Summary\n(Total, Added, Updated, Skipped)", LIGHT_BLUE, BORDER_BLUE, bold=True)
    draw_oval(ax, 0.65, 0.025, 0.20, 0.045, "Success: Roster Synced", LIGHT_BLUE, BORDER_BLUE, bold=True)
    
    # Connecting arrows Right Column
    draw_arrow(ax, 0.75, 0.85, 0.75, 0.795)
    draw_arrow(ax, 0.75, 0.71, 0.75, 0.65, "No (New)")
    draw_arrow(ax, 0.87, 0.75, 0.91, 0.50, rad=0.25)
    draw_arrow(ax, 0.91, 0.50, 0.90, 0.50, "Yes (Update)")
    draw_arrow(ax, 0.75, 0.59, 0.75, 0.53)
    draw_arrow(ax, 0.75, 0.47, 0.75, 0.41)
    draw_arrow(ax, 0.75, 0.35, 0.75, 0.29)
    draw_arrow(ax, 0.75, 0.23, 0.75, 0.18)
    draw_arrow(ax, 0.75, 0.12, 0.75, 0.075)
    
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
    
    # Entities to draw (8 collections, without offlineBallots)
    entities = [
        # (x, y, w, h, title, fields)
        (0.04, 0.60, 0.26, 0.33, "USERS (users)", [
            ("id [PK]", "string (u_hash)"),
            ("studentNumber [UQ]", "string (12-digit LRN)"),
            ("fullName", "string"),
            ("password", "string (scrypt)"),
            ("role", "string (admin/teacher/student)"),
            ("yearLevel", "integer (1-12)"),
            ("section / room", "string (e.g. Glassfish)"),
            ("hasSetPassword", "boolean"),
            ("sex / birthDate / age", "string / integer"),
            ("motherTongue / ethnicGroup", "string"),
            ("address / guardians", "string (DepEd SF1)"),
            ("photoUrl", "string")
        ]),
        (0.37, 0.60, 0.26, 0.33, "ELECTIONS (elections)", [
            ("id [PK]", "string (doc ID)"),
            ("title", "string"),
            ("description", "string"),
            ("startsAt", "string (ISO timestamp)"),
            ("endsAt", "string (ISO timestamp)"),
            ("scope", "string (all/grade/sec/room)"),
            ("scopeValue", "string"),
            ("hasPartyList", "boolean"),
            ("targetGradeLevel", "integer (1-12)"),
            ("targetSection / Room", "string"),
            ("hasPartyListSupport", "boolean (legacy)")
        ]),
        (0.70, 0.60, 0.26, 0.33, "POSITIONS (positions)", [
            ("id [PK]", "string (doc ID)"),
            ("electionId [FK]", "string -> ELECTIONS"),
            ("name", "string"),
            ("normalizedName [UQ]", "string (scoped unique)"),
            ("title", "string (legacy alias)")
        ]),
        (0.04, 0.22, 0.26, 0.32, "CANDIDATES (candidates)", [
            ("id [PK]", "string (doc ID)"),
            ("electionId [FK]", "string -> ELECTIONS"),
            ("positionId [FK]", "string -> POSITIONS"),
            ("userId [FK]", "string -> USERS"),
            ("partyListId [FK]", "string -> PARTY_LISTS"),
            ("fullName", "string"),
            ("party", "string"),
            ("manifesto", "string (platform)"),
            ("photoUrl", "string"),
            ("voteCount", "integer (tally cache)")
        ]),
        (0.37, 0.22, 0.26, 0.32, "VOTES (votes)", [
            ("id [PK]", "string (v_hash)"),
            ("electionId [FK]", "string -> ELECTIONS"),
            ("positionId [FK]", "string -> POSITIONS"),
            ("candidateId [FK]", "string -> CANDIDATES"),
            ("voterId [FK]", "string -> USERS"),
            ("userId", "string (legacy alias)"),
            ("timestamp", "string (ISO timestamp)"),
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
        (0.12, 0.03, 0.34, 0.14, "AUDIT_LOGS (auditLogs)", [
            ("id [PK]", "string (doc ID)"),
            ("action", "string (e.g. LOGIN, VOTE, IMPORT)"),
            ("performedBy / Role", "string (actor identity)"),
            ("timestamp", "string (descending index)"),
            ("details", "string (payload snapshot)")
        ]),
        (0.54, 0.03, 0.34, 0.14, "BRANDING (branding)", [
            ("id [PK]", "string ('school')"),
            ("schoolName", "string (Bolinao School of Fisheries)"),
            ("tagline / logoUrl", "string (theme assets)"),
            ("primaryColor / Attrib", "string (#0284c7 / GWC)"),
            ("contactEmail / address", "string (official info)")
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
            
    # Clean, non-overlapping Relationship Connectors
    # USERS -> CANDIDATES (1:M)
    draw_arrow(ax, 0.17, 0.60, 0.17, 0.54, "1 : M (Nomination)", color=BORDER_BLUE, fontsize=7)
    # ELECTIONS -> POSITIONS (1:M)
    draw_arrow(ax, 0.63, 0.77, 0.70, 0.77, "1 : M", color=NAVY, fontsize=7)
    # ELECTIONS -> VOTES (1:M)
    draw_arrow(ax, 0.50, 0.60, 0.50, 0.54, "1 : M", color=NAVY, fontsize=7)
    # ELECTIONS -> CANDIDATES (1:M)
    draw_arrow(ax, 0.37, 0.70, 0.30, 0.50, "1 : M", color=NAVY, rad=-0.08, fontsize=7)
    # ELECTIONS -> PARTY_LISTS (1:M)
    draw_arrow(ax, 0.63, 0.65, 0.70, 0.45, "1 : M", color=NAVY, rad=0.08, fontsize=7)
    # CANDIDATES -> VOTES (1:M)
    draw_arrow(ax, 0.30, 0.36, 0.37, 0.36, "1 : M (Tally)", color=ACCENT_GREEN, fontsize=7)
    # PARTY_LISTS -> CANDIDATES (1:M)
    draw_arrow(ax, 0.70, 0.28, 0.30, 0.28, "1 : M (Affiliation)", color=BORDER_AMBER, rad=-0.12, fontsize=7)
    
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
