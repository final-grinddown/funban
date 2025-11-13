# Typia Ecosystem Alternatives Research

**Last Updated:** 2025-11-13
**Status:** Monitoring for community solutions

## Current Situation

Funban uses Typia for runtime validation with `@ryoppippi/unplugin-typia` for Next.js integration. The unplugin was archived in June 2025 but remains functional.

## Research Goals

1. Monitor for community forks of unplugin-typia
2. Track official Typia support for Next.js/SWC
3. Document viable alternatives if migration becomes necessary

## Active Monitoring

### Official Typia Repository

- **URL**: https://github.com/samchon/typia
- **Status**: ✅ Active (v10.0.2 released Nov 9, 2025)
- **Next.js Support**: Currently requires transformer plugins (ts-patch or unplugin)
- **SWC Compatibility**: Not natively supported (SWC doesn't support TypeScript transformers)

### Community Solutions

#### unplugin-typia Forks

**Search Strategy:**
- GitHub search: `"unplugin-typia" fork:true`
- Check for active maintenance and recent commits

**Findings** (as of 2025-11-13):
- No major active forks found yet
- Original repository has 240+ stars, indicating community interest
- Potential for community fork if critical need arises

#### Alternative Integration Methods

1. **Official ts-patch Approach**
   - Requires switching from SWC back to tsc
   - Would lose Next.js build optimizations
   - Not recommended for Next.js projects

2. **Custom SWC Plugin**
   - Could theoretically bridge Typia and SWC
   - High complexity, would need Rust expertise
   - No existing implementations found

3. **Babel Plugin**
   - Next.js has moved away from Babel to SWC
   - Would be regression in build performance
   - Not recommended

## Alternative Validation Libraries

### If Migration Required

| Library | Pros | Cons | Recommendation |
|---------|------|------|----------------|
| **Zod** | Mature, widely used, great TS inference | Schema duplication, slower | ⚠️ Last resort |
| **Valibot** | Smaller bundle, modular | Less mature, schema duplication | ⚠️ Last resort |
| **ArkType** | Fast, good DX | Schema duplication, newer | ⚠️ Last resort |
| **TypeBox** | JSON Schema compatible | Schema duplication | ⚠️ Last resort |

**Key Issue**: All alternatives require duplicating TypeScript types as validation schemas, losing our single source of truth architecture.

## Recommended Actions

### Immediate (Done)
- ✅ Pin unplugin-typia version
- ✅ Document dependency status
- ✅ Set up Dependabot monitoring

### Quarterly (Every 3 months)
- [ ] Check GitHub for unplugin-typia forks
- [ ] Review Typia issues for Next.js support updates
- [ ] Run security audit on dependencies
- [ ] Update this document with findings

### On-Demand (As needed)
- Monitor Next.js release notes for transformer support
- Test compatibility before major upgrades
- Re-evaluate if critical security issue emerges

## Potential Future Solutions

### Community Fork

**Indicators to watch:**
- GitHub issues on original repo requesting continuation
- Active forks with recent commits
- Community discussions about maintenance

**If fork emerges:**
1. Evaluate maintainer credibility
2. Review code changes vs original
3. Check for security audit
4. Test with our setup before switching

### Official Typia Next.js Support

**Indicators to watch:**
- Typia GitHub issues mentioning Next.js/SWC
- Official documentation updates
- New packages from Typia maintainer

**If official support emerges:**
1. Review integration approach
2. Test with our contracts
3. Plan migration timeline
4. Update architecture docs

## Migration Decision Matrix

| Trigger | Recommended Action | Timeline |
|---------|-------------------|----------|
| **Security vulnerability** | Immediate fork or migrate to Zod | 1-2 days |
| **Next.js breaking change** | Test compatibility, fork if needed | 1 week |
| **Active community fork** | Evaluate and potentially switch | 2-3 days |
| **Official support** | Plan migration to official | 1-2 weeks |
| **No issues** | Continue current setup | Ongoing |

## Resources

- [Typia Official Docs](https://typia.io/)
- [Typia GitHub](https://github.com/samchon/typia)
- [unplugin-typia (archived)](https://github.com/ryoppippi/unplugin-typia)
- [Next.js Compiler Docs](https://nextjs.org/docs/architecture/nextjs-compiler)
- [SWC Docs](https://swc.rs/)

## Update Log

| Date | Finding | Action |
|------|---------|--------|
| 2025-11-13 | Initial research | Created document, pinned versions |
| TBD | Next quarterly check | - |

---

**Next Review:** 2026-02-13 (3 months from initial setup)
