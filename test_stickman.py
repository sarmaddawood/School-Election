import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches

NAVY = "#1B365D"
PURPLE = "#8E44AD"
ACCENT_GREEN = "#27AE60"
ACCENT_AMBER = "#D35400"
DARK_GRAY = "#2C3E50"

fig, ax = plt.subplots(figsize=(12, 8.5), dpi=300)
ax.set_xlim(0, 1)
ax.set_ylim(0, 1)
ax.axis('off')

def draw_stickman(ax, cx, cy, title, subtitle="", color=NAVY, scale=1.0, fontsize=9):
    # Aspect ratio correction for circle
    aspect = 8.5 / 12.0
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
    # Left arm
    ax.plot([cx, cx - arm_span_x], [shoulder_y, shoulder_y - arm_drop_y], color=color, linewidth=2.3, solid_capstyle='round', zorder=4)
    # Right arm
    ax.plot([cx, cx + arm_span_x], [shoulder_y, shoulder_y - arm_drop_y], color=color, linewidth=2.3, solid_capstyle='round', zorder=4)
    
    # Legs
    leg_span_x = 0.026 * scale * aspect
    leg_drop_y = 0.045 * scale
    feet_y = hip_y - leg_drop_y
    # Left leg
    ax.plot([cx, cx - leg_span_x], [hip_y, feet_y], color=color, linewidth=2.3, solid_capstyle='round', zorder=4)
    # Right leg
    ax.plot([cx, cx + leg_span_x], [hip_y, feet_y], color=color, linewidth=2.3, solid_capstyle='round', zorder=4)
    
    # Text label below feet
    text_y = feet_y - 0.016
    ax.text(cx, text_y, title, ha='center', va='top', fontsize=fontsize, weight='bold', color=color, zorder=5)
    if subtitle:
        ax.text(cx, text_y - 0.028, subtitle, ha='center', va='top', fontsize=fontsize - 1.5, weight='normal', color=DARK_GRAY, zorder=5)

draw_stickman(ax, 0.12, 0.72, "Administrator", "(System Admin)", color=PURPLE, scale=1.0)
draw_stickman(ax, 0.12, 0.32, "Teacher / Auditor", "(Faculty Observer)", color=ACCENT_GREEN, scale=1.0)
draw_stickman(ax, 0.88, 0.72, "Student Voter", "(Eligible Student)", color=NAVY, scale=1.0)
draw_stickman(ax, 0.88, 0.32, "Candidate", "(Nominated Student)", color=ACCENT_AMBER, scale=1.0)

plt.tight_layout()
plt.savefig('test_stickman.png', bbox_inches='tight', dpi=150)
plt.close()
print("Saved test_stickman.png")
