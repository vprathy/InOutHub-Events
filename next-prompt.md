---
page: global-frame
---
Generate the 'Global Frame' (App Shell) for the InOutHub Events mobile app. This is the persistent container that establishes orientation context and navigation spine for all other screens.

**DESIGN SYSTEM (SEMANTIC):**
- **Theme**: "Premium dark command center outside, calm task clarity inside." (Ref: DESIGN.md Section 2)
- **Atmosphere**: Dark premium shell, high-contrast operational mood, backstage command center character.
- **Hierarchy**: Follow accent-driven hierarchy for active paths and priorities.

**SHELL STRUCTURE (Ref: DESIGN.md Section 4):**
1. **Compact Orientation Header**:
   - Provide orientation context (Organization and Event).
   - Include session control (User and Log Out).
   - **Restriction**: Do not duplicate page title or page summary in the header. (Ref: Section 4.1)
2. **Swappable Middle Task Surface**:
   - A neutral, restrained placeholder region for screen-specific content.
   - **Restriction**: Do not design a specific task screen or content in this area yet.
3. **Stable Bottom Navigation**:
   - Persistent navigation spine for the primary app surfaces.
   - Clear high-contrast 'Active' state for the current destination.

**Interaction Model:**
- Mobile-first, high-contrast, calm task clarity.
- Direct, functional layout optimized for thumb-zone operation.
- Use a "venue frame" approach to wrap the working content.
