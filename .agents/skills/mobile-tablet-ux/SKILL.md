---
name: Mobile & Tablet UX Guardrails
description: Defines the strict UI/UX standards for ensuring the InOutHub Command Center is operationally effective on touch devices in live event environments.
---

# **MOBILE & TABLET UX GUARDRAILS (UXG)**

**Document ID:** UXG-001
**Status:** ACTIVE, MANDATORY
**Purpose:** To define the interaction model, layout constraints, and visual standards for the InOutHub mobile and tablet experiences. This ensures the app remains effective for stage managers and admins working in high-pressure, low-light, or one-handed environments.

---

## **I. THE CORE GUARDRAILS**

### **1. The "44px" Rule (Minimum Touch Targets)**
*   **Standard**: Every interactive element (button, toggle, link) MUST have a minimum hit area of **44x44 logical pixels**.
*   **Implementation**: Use larger padding or `min-h-[44px]` for buttons. Avoid placing small icons too close to each other.
*   **Why**: Accommodates the average human fingertip and reduces "mis-taps" during high-pressure live execution.

### **2. The "Thumb Zone" Architecture (Mobile Priority)**
*   **Standard**: Primary operational actions (Next, Pause, Status) and Navigation must be consolidated in the bottom 40% of the screen.
*   **Implementation**: Use a persistent `BottomNav` for main app sections. Place critical CTA buttons in fixed-bottom containers or large, full-width blocks.
*   **Why**: Ensures one-handed usability on large modern smartphones (e.g., iPhone Pro Max).

### **3. Progressive Disclosure (Anti-Clutter)**
*   **Standard**: High-level lists must display only "At-a-Glance" status. Secondary details (notes, full cast, technical specs) must be hidden behind an expansion or a dedicated workspace page.
*   **Implementation**: Use the "Compact Card" pattern for lists (e.g., `ActCard`) and deep-link to full "Workspaces" for management.
*   **Why**: Prevents cognitive overload on small viewports and ensures the most important operational data stays visible.

### **4. Visual Legibility (Live Event Context)**
*   **Standard**: Use high-contrast status indicators and a minimum body font size of **16px**.
*   **Implementation**: 
    *   Status badges must use vibrant, semantically distinct colors (Emerald = Ready, Amber = Arrived/Wait).
    *   Use bold/black font weights for primary data points (e.g., Act Name, Time).
*   **Why**: Ensures visibility at arm's length or in low-light/high-glare backstage environments.

### **5. Dashboard-Mode (Tablet Breakpoint)**
*   **Standard**: At the **`md` (768px)** breakpoint, the layout must intelligently transition from "Scrolling List" to "Dashboard View."
*   **Implementation**:
    *   Use `grid-cols-1 md:grid-cols-2` for controllers like the Live Console.
    *   Take advantage of landscape real estate to show "Now" and "Next Up" simultaneously.
*   **Why**: A tablet is an "Operational Command Center," not a wide phone. Maximizing real estate improves total situational awareness.

---

## **II. TECHNICAL STANDARDS (Tailwind CSS)**

| Requirement | Tailwind Utility / Breakpoint |
| :--- | :--- |
| **Mobile Width** | Use default (no prefix) for widths up to `sm:640px`. |
| **Tablet Breakpoint** | `md:768px` is our primary target for tablet-specific layout shifts. |
| **Safe Spacing** | Use at least `p-4` or `p-6` for containers to prevent content from hitting the screen edges. |
| **Font Sizing** | Use `text-base` (16px) as the absolute minimum for inputs and primary text. |

## **III. VERIFICATION PROTOCOL**

When reviewing a new UI component, ask:
1.  **"Can I tap this accurately with a thumb while walking?"**
2.  **"On a tablet, are we wasting space that could be used for extra context?"**
3.  **"Is the font size large enough to read without squinting?"**

---

## **IV. USER-DIRECTED CHANGE PROTOCOL**

### **1. Explicit Instructions Override Taste**
*   **Standard**: If the user specifies placement, wording, hierarchy, or interaction behavior, implement that exact request first.
*   **Do Not**: Quietly substitute a different pattern just because it seems cleaner, more standard, or more elegant.

### **2. Proposals Must Be Labeled**
*   **Standard**: If a different UX solution appears materially better, present it as a proposal before implementing it.
*   **Format**: “You asked for X. I can do that, or I can propose Y because...”
*   **Do Not**: Ship Y while pretending it fulfills X.

### **3. Complete the Asked-For Change Before Adjacent Polish**
*   **Standard**: Do not solve neighboring UX issues instead of the specific requested change.
*   **Why**: Adjacent cleanup feels productive to the agent but creates churn and frustration for the operator.

### **4. Mobile Work Must Be Task-First**
*   **Standard**: On mobile, prioritize the exact operator task the user is describing over generic “dashboard” or “card” instincts.
*   **Example**: If the user asks for actions inside an expanded row, do not move them into a separate detail panel unless that is explicitly approved.
