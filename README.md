# Can I Dine? Mobile Guest Menu Prototype

A standalone, mobile-first hybrid of the live Canidine guest menu and the V3 design direction. It is designed to be easy for first-time users of any age: one clear starting action, three short setup steps, large controls and plain-language results.

**Live prototype:** https://canidine-mobile-guest-prototype.vercel.app

## Preserved product behaviors

- Restaurant identity and branding
- Meal-period filtering
- Nine common allergies first, with the full public restriction list one tap away
- A three-step guided setup for allergies, diets and severity
- Severe-allergy mode
- Diets and medical conditions
- Plain-language custom restrictions
- Cross-contact guidance, cooking oils and restaurant evidence
- Plain result labels: No match found, Ask for a change and Do not order
- Multiple guest languages

The prototype reads only the existing public Canidine restaurant and allergen endpoints through Vercel. A packaged Terra Cucina snapshot is used locally or if the public API is temporarily unavailable. It contains no authenticated data and performs no production writes.
