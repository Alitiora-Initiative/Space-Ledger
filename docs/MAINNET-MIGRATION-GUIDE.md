# Space Ledger Mainnet Migration Guide

## Overview
This document outlines all steps, requirements, and considerations for migrating Space Ledger from Solana Devnet to Mainnet Beta or Mainnet.

---

## Phase 1: Legal & Regulatory Compliance (CRITICAL - FIRST STEP)

### 1.1 Legal Jurisdiction Analysis
- [ ] **Determine primary jurisdiction(s)** where the service will operate
- [ ] **Consult qualified securities attorneys** in each jurisdiction
- [ ] **Classification review**: Determine if blocks/tokens are:
  - Securities (SEC, EU MiCA, etc.)
  - Commodities
  - Digital assets
  - Utility tokens
- [ ] **Consumer protection laws**: Review requirements in target markets
- [ ] **AML/KYC requirements**: Determine if identity verification is required
- [ ] **Tax implications**: Understand tax treatment for users and operator

### 1.2 Terms of Service & Legal Documentation
- [ ] **Draft comprehensive ToS** for mainnet (not Devnet)
- [ ] **Privacy Policy** with real operator contact details
- [ ] **Risk Disclosures** - prominent warnings about investment risks
- [ ] **Cookie Policy** - if analytics/tracking added
- [ ] **Refund Policy** - clarify no refunds on blockchain transactions
- [ ] **Dispute Resolution** mechanism
- [ ] **Governing Law & Jurisdiction** clauses

### 1.3 Operator Legal Structure
- [ ] **Entity formation** (LLC, Corporation, etc.)
- [ ] **Registered business address**
- [ ] **Legal contact email & phone**
- [ ] **Business licenses** (if required)
- [ ] **Bank accounts** for fiat operations (if any)
- [ ] **Insurance** (cyber liability, professional liability)

### 1.4 Intellectual Property
- [ ] **Logo trademark registration**
- [ ] **Brand name trademark**
- [ ] **Confirm logo authorship/licensing** (currently in issue #6)
- [ ] **Copyright all code and documentation**
- [ ] **Domain name ownership verification**

---

## Phase 2: Technical Architecture Changes

### 2.1 Smart Contract Modifications
- [ ] **Audit current Devnet program** by reputable firm (Certik, OtterSec, etc.)
- [ ] **Update program constants**:
  - Change RPC endpoints from Devnet to Mainnet Beta/Mainnet
  - Update Pyth price feed accounts for mainnet
  - Adjust any test-only configurations
- [ ] **Upgradeability pattern**: Implement program upgrade authority securely
- [ ] **Add pausing/emergency stop functionality**
- [ ] **Implement fee adjustments** if needed (mainnet may need different fee structure)
- [ ] **Add transfer/sale instructions** (tracked in issue #11)
- [ ] **Security review** of all account validations and checks

### 2.2 Pricing Model Review
- [ ] **Evaluate bonding curve parameters** for mainnet
  - Current: $0.001 → $1,000 over 10B blocks
  - Consider: Supply cap, price floor, price ceiling
- [ ] **Add dynamic pricing** based on SOL/USD feed fluctuations
- [ ] **Implement slippage protection** for purchases
- [ ] **Add minimum purchase amounts** to prevent dust spam
- [ ] **Consider maximum purchase limits** to prevent whale domination

### 2.3 Wallet Integration
- [ ] **Update wallet adapters** for mainnet network
- [ ] **Test with multiple mainnet wallets** (Phantom, Solflare, Backpack, etc.)
- [ ] **Implement WalletConnect** (issue #8) for mobile support
- [ ] **Add deep-link schemes** for mobile wallets
- [ ] **Add QR code scanning** for wallet connections
- [ ] **Multi-wallet support testing**

### 2.4 Backend Infrastructure
- [ ] **RPC Providers**:
  - Evaluate mainnet RPC options (Helius, Triton, QuickNode, etc.)
  - Set up failover/redundancy
  - Implement rate limiting at appropriate levels
- [ ] **Database considerations**:
  - Indexer for fast ownership queries
  - Cache layer for frequently accessed data
  - Backup strategy
- [ ] **API Security**:
  - Rate limiting per IP/wallet
  - Request signing verification
  - CORS configuration
  - API key authentication if needed
- [ ] **Monitoring & Logging**:
  - Application performance monitoring (APM)
  - Error tracking (Sentry, etc.)
  - Transaction monitoring
  - Alert systems

### 2.5 Frontend Updates
- [ ] **Update all network indicators** from Devnet to Mainnet
- [ ] **Remove "test prototype" warnings** (or adjust for mainnet)
- [ ] **Update price displays** for mainnet value context
- [ ] **Add real SOL/USDC prices** via Pyth or other oracles
- [ ] **Implement transaction queue** for high-volume periods
- [ ] **Add loading states** for all async operations
- [ ] **Mobile optimization** (responsive design testing)

---

## Phase 3: Security & Auditing

### 3.1 Smart Contract Security
- [ ] **Formal audit** by top-tier firm (budget $20k-$100k+)
- [ ] **Bug bounty program** (Immunefi, Sherlock, etc.)
- [ ] **Internal security review**
- [ ] **Penetration testing** of all integrations
- [ ] **Supply chain audit** of dependencies
- [ ] **Key management strategy**:
  - Program upgrade authority key storage
  - Treasury key storage (hardware wallet/multisig)
  - Deployer key management

### 3.2 Web Application Security
- [ ] **Security headers** (CSP, HSTS, X-Frame-Options, etc.)
- [ ] **Input validation** on all forms
- [ ] **Output encoding** to prevent XSS
- [ ] **CSRF protection** for state-changing operations
- [ ] **DDoS protection** (Cloudflare, etc.)
- [ ] **API abuse prevention**
- [ ] **Secure cookie practices** (if cookies used)

### 3.3 Operational Security
- [ ] **Multisig wallet setup** for treasury
  - Minimum 3/5 signers recommended
  - Key holders: operator, legal, security, backups
- [ ] **Hardware wallet usage** for critical keys
- [ ] **Key rotation policy**
- [ ] **Access control** for admin functions
- [ ] **Incident response plan**
- [ ] **Disaster recovery plan**

---

## Phase 4: Testing & Validation

### 4.1 Mainnet Beta Testing
- [ ] **Deploy to Solana Mainnet Beta** first
- [ ] **Test all user flows**:
  - Wallet connection
  - Quote generation
  - Transaction signing
  - Purchase settlement
  - Portfolio viewing
  - Grid browsing
- [ ] **Load testing** with simulated traffic
- [ ] **Test edge cases**:
  - Low SOL balance
  - Network congestion
  - Failed transactions
  - Timeout scenarios
- [ ] **Test on multiple devices/browsers**
- [ ] **Mobile testing** (iOS/Android)

### 4.2 Data Migration (if any)
- [ ] **No Devnet data migration** (fresh start on mainnet)
- [ ] **Consider whitelisting early adopters** if desired
- [ ] **Testnet wipe** strategy documented

### 4.3 Performance Testing
- [ ] **Benchmark API response times**
- [ ] **Test page load times**
- [ ] **Measure transaction confirmation times**
- [ ] **Stress test RPC endpoints**
- [ ] **Test under network congestion**

---

## Phase 5: Infrastructure & Deployment

### 5.1 Hosting & CDN
- [ ] **Vercel configuration**:
  - Update environment variables for mainnet
  - Configure custom domain (if not already)
  - Set up edge functions if needed
  - Configure build/production settings
- [ ] **CDN configuration** for static assets
- [ ] **SSL/TLS certificates** (automatic with Vercel)
- [ ] **Domain DNS configuration**

### 5.2 Environment Variables
```bash
# Update these for mainnet:
SOLANA_NETWORK=mainnet-beta  # or mainnet
SOLANA_PROGRAM_ID=<mainnet program ID>
SOLANA_RPC_MAINNET=<your RPC endpoint>
PYTH_PRICE_FEED_ACCOUNT=<mainnet Pyth account>
```

### 5.3 Database & Indexer
- [ ] **Set up indexer** (e.g., Helius indexer or custom)
- [ ] **Configure real-time data sync**
- [ ] **Test query performance**
- [ ] **Set up backups**

### 5.4 Monitoring Setup
- [ ] **Application monitoring** (Vercel Analytics, etc.)
- [ ] **Error tracking** (Sentry)
- [ ] **Uptime monitoring** (Pingdom, UptimeRobot)
- [ ] **Transaction monitoring** (custom dashboard)
- [ ] **RPC health monitoring**
- [ ] **Alert configuration**

---

## Phase 6: Financial & Treasury Setup

### 6.1 Treasury Management
- [ ] **Set up mainnet treasury wallet** (multisig recommended)
- [ ] **Configure fee collection**:
  - Platform fee percentage
  - Fee distribution addresses
- [ ] **Set up SOL/USDC withdrawal procedures**
- [ ] **Implement fee reporting**
- [ ] **Bank account for fiat conversion** (if applicable)

### 6.2 Payment Integration
- [ ] **Test SOL payments** on mainnet
- [ ] **Test USDC payments** on mainnet
- [ ] **Add other tokens** if desired (requires contract changes)
- [ ] **Configure price oracles** (Pyth, Switchboard, etc.)
- [ ] **Implement price update mechanism**

### 6.3 Economic Model Review
- [ ] **Finalize fee structure**:
  - Platform fee per transaction
  - Maximum fee caps
  - Fee distribution split
- [ ] **Set treasury allocation** (e.g., for development, marketing, reserves)
- [ ] **Model revenue projections**
- [ ] **Define financial reporting requirements**

---

## Phase 7: Documentation & Communication

### 7.1 User Documentation
- [ ] **Update all user guides** for mainnet
- [ ] **Mainnet FAQ**:
  - What's different from Devnet?
  - Real money usage warnings
  - Transaction fees
  - Security best practices
- [ ] **Troubleshooting guide**
- [ ] **Video tutorials** (optional but recommended)

### 7.2 Developer Documentation
- [ ] **Update README** with mainnet info
- [ ] **Update API documentation**
- [ ] **Document mainnet program architecture**
- [ ] **Create integration guides** (if exposing APIs)

### 7.3 Launch Communication
- [ ] **Launch announcement blog post**
- [ ] **Social media plan** (Twitter, Discord, etc.)
- [ ] **Community update** in existing channels
- [ ] **Press release** (if applicable)
- [ ] **Landing page updates**

---

## Phase 8: Launch Day Checklist

### 8.1 Pre-Launch (24-48 hours before)
- [ ] **Final code audit review**
- [ ] **Security final sweep**
- [ ] **Verify all environment variables**
- [ ] **Test mainnet RPC connections**
- [ ] **Verify Pyth price feeds**
- [ ] **Test treasury wallet**
- [ ] **Deploy to production**
- [ ] **Final smoke tests**
- [ ] **Team on standby**

### 8.2 Launch Day
- [ ] **Monitor system health** continuously
- [ ] **Watch for error spikes**
- [ ] **Monitor transaction confirmations**
- [ ] **Support channel ready** (Discord, email)
- [ ] **Social media monitoring**
- [ ] **Be ready to pause** if critical issues arise

### 8.3 Post-Launch (First 7 days)
- [ ] **Daily health reports**
- [ ] **Review transaction patterns**
- [ ] **Address user feedback**
- [ ] **Fix any critical bugs**
- [ ] **Update documentation** based on issues
- [ ] **Analyze performance metrics**

---

## Phase 9: Ongoing Operations

### 9.1 Regular Maintenance
- [ ] **Weekly security scans**
- [ ] **Monthly dependency updates**
- [ ] **Quarterly security audits**
- [ ] **Regular key rotation**
- [ ] **Treasury reconciliation**

### 9.2 Compliance Monitoring
- [ ] **Regulatory change tracking**
- [ ] **Annual legal review**
- [ ] **Tax filing preparation**
- [ ] **AML/KYC compliance monitoring** (if applicable)

### 9.3 Development Roadmap
- [ ] **Secondary market implementation** (issue #11)
- [ ] **Pixel-level ownership** (issue #10)
- [ ] **Mobile wallet support** (issue #8)
- [ ] **Additional features** based on user feedback

---

## Estimated Timeline

### Minimum (Aggressive): 3-4 months
- Legal & compliance: 4-6 weeks
- Technical development: 4-6 weeks
- Auditing & testing: 4-6 weeks
- Launch preparation: 2 weeks

### Realistic: 6-12 months
- Legal & compliance: 8-12 weeks
- Technical development: 8-12 weeks
- Auditing & testing: 8-12 weeks
- Launch preparation: 4 weeks

### Conservative: 12-18 months
- Full regulatory compliance
- Multiple audit rounds
- Extensive testing
- Staged rollout

---

## Estimated Costs

### Legal
- Attorney consultation: $5,000 - $50,000+
- Securitization/legal opinion: $10,000 - $100,000+

### Security
- Smart contract audit: $20,000 - $100,000+
- Bug bounty: $10,000 - $50,000+ ongoing
- Penetration testing: $5,000 - $20,000

### Infrastructure
- RPC services: $200 - $2,000/month
- Indexer: $500 - $2,000/month
- Monitoring/logging: $100 - $500/month
- CDN/hosting: Included with Vercel (or ~$20-100/month)

### Development
- Additional developer time: Variable
- Contingency budget: 20-30% of total

**Total Estimated Range: $50,000 - $300,000+**

---

## Critical Success Factors

1. **Legal Compliance First** - Don't launch without proper legal review
2. **Security Audits** - Non-negotiable for mainnet
3. **Treasury Security** - Multisig, hardware wallets, key management
4. **User Experience** - Smooth, tested flows
5. **Communication** - Clear messaging about risks
6. **Monitoring** - Real-time visibility into operations
7. **Support** - Responsive user support
8. **Regulatory Awareness** - Stay updated on changing regulations

---

## Red Flags - Do Not Launch If

- [ ] Legal review not completed
- [ ] No security audit performed
- [ ] Treasury keys not in hardware wallet/multisig
- [ ] No incident response plan
- [ ] Insufficient testing on mainnet beta
- [ ] No support infrastructure
- [ ] Unclear regulatory status
- [ ] Insurance not obtained
- [ ] No monitoring/alerting in place
- [ ] Team not prepared for 24/7 issues

---

## References & Resources

### Solana Mainnet Resources
- [Solana Documentation](https://docs.solana.com/)
- [Solana Program Library](https://solanacookbook.com/)
- [Pyth Network](https://pyth.network/)
- [Helius RPC](https://helius.xyz/)

### Legal Resources
- [SEC Digital Assets](https://www.sec.gov/digitalassets)
- [EU MiCA Regulation](https://www.europarl.europa.eu/)
- [Kenya Data Protection Act](https://new.kenyalaw.org/akn/ke/act/2019/24/eng@2019-11-15)

### Security Resources
- [Immunefi Bug Bounty](https://immunefi.com/)
- [Sherlock Audits](https://sherlock.xyz/)
- [Certik Audits](https://www.certik.com/)
- [OtterSec Audits](https://www.ottersec.com/)

### Developer Tools
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor Framework](https://www.anchor-lang.com/)
- [Metaplex](https://metaplex.com/)

---

## Next Steps

1. **Phase 1**: Schedule legal consultation immediately
2. **Budget**: Secure funding for legal, audits, and infrastructure
3. **Team**: Assemble mainnet launch team (legal, technical, operations)
4. **Timeline**: Create detailed project plan with milestones
5. **Communication**: Keep community informed of progress

---

*This document is a living guide. Update as requirements change and new information becomes available.*
