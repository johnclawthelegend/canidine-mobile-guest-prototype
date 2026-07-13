# Can I Dine? Mobile Guest Menu Prototype

A standalone, mobile-first hybrid of the live Canidine guest menu and the V3 design direction.

## Preserved product behaviors

- Restaurant identity and branding
- Meal-period filtering
- The full public canonical restriction list
- Severe-allergy mode
- Diets and medical conditions
- Plain-language custom restrictions
- Cross-contact guidance, cooking oils and restaurant evidence
- Clear, modifiable and avoid menu results
- Multiple guest languages

The prototype reads only the existing public Canidine restaurant and allergen endpoints through Vercel. A packaged Terra Cucina snapshot is used locally or if the public API is temporarily unavailable. It contains no authenticated data and performs no production writes.
