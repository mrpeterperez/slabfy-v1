# Modular Storage (Scaffold)

This directory introduces a modular storage structure for SlabFy, decomposing the monolithic `server/storage.ts` into domain-specific modules. This commit is scaffolding only — no runtime changes.

Structure
- base/: shared types and BaseStorage class
- user/: user storage interface
- assets/: assets storage interface
- market/: sales history storage interface
- events/: events + card shows storage interface
- contacts/: contacts storage interface
- consignments/: consignment storage interface
- collections/: collections storage interface
- portfolio/: portfolio calculations interface

Next steps
1) Implement concrete classes per domain by moving methods from `DatabaseStorage`
2) Compose a `Storage` registry with all domains, wiring the same DB instance
3) Migrate route imports incrementally, preserving backward compatibility
