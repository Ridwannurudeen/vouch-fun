# vouch.fun Frontend

React + TypeScript + Vite frontend for vouch.fun — the composable trust synthesis protocol.

## Setup

```bash
npm install
cp .env.example .env  # Edit with your contract address
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_CONTRACT_ADDRESS` | Deployed VouchProtocol contract address |
| `VITE_DEMO_PRIVATE_KEY` | Account private key (for write transactions) |
| `VITE_USE_STUDIO` | `true` for GenLayer Studio, `false` for Bradbury testnet |
| `VITE_STUDIO_RPC_URL` | Custom RPC URL (only when using Studio) |

## Stack

- **React 19** + TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Recharts** for trust dimension radar charts
- **genlayer-js** SDK for on-chain interaction

## Pages

- `/` — Search and vouch for any GitHub handle
- `/profile/:handle` — Trust profile with 6-dimension breakdown
- `/explore` — Browse all vouched profiles
- `/compare` — Head-to-head trust comparison
- `/gates` — Trust gates, oracle queries, and score decay
- `/how-it-works` — Protocol explanation
- `/integrate` — API documentation and code examples
