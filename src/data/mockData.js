const baseInfluencers = [
  { id: 1, handle: '@CryptoWhale', name: 'Whale Alerts', followers: '1.2M', successRate: '100%', avgPump: '3500%', avatar: 'https://i.pravatar.cc/150?u=1' },
  { id: 2, handle: '@DegenSpartan', name: 'Spartan', followers: '450K', successRate: '100%', avgPump: '2100%', avatar: 'https://i.pravatar.cc/150?u=2' },
  { id: 3, handle: '@Ansem', name: 'Ansem', followers: '320K', successRate: '100%', avgPump: '4200%', avatar: 'https://i.pravatar.cc/150?u=3' },
  { id: 4, handle: '@Pentosh1', name: 'Pentoshi', followers: '800K', successRate: '100%', avgPump: '1800%', avatar: 'https://i.pravatar.cc/150?u=4' },
  { id: 5, handle: '@HsakaTrades', name: 'Hsaka', followers: '550K', successRate: '100%', avgPump: '2700%', avatar: 'https://i.pravatar.cc/150?u=5' },
  { id: 6, handle: '@Cobie', name: 'Cobie', followers: '780K', successRate: '100%', avgPump: '1500%', avatar: 'https://i.pravatar.cc/150?u=6' },
  { id: 7, handle: '@Gainzy', name: 'Gainzy', followers: '250K', successRate: '100%', avgPump: '3100%', avatar: 'https://i.pravatar.cc/150?u=7' },
  { id: 8, handle: '@LomahCrypto', name: 'Lomah', followers: '390K', successRate: '100%', avgPump: '2400%', avatar: 'https://i.pravatar.cc/150?u=8' },
  { id: 9, handle: '@CredibleCrypto', name: 'Credible Crypto', followers: '410K', successRate: '100%', avgPump: '1900%', avatar: 'https://i.pravatar.cc/150?u=9' },
  { id: 10, handle: '@AltcoinSherpa', name: 'Altcoin Sherpa', followers: '210K', successRate: '100%', avgPump: '2900%', avatar: 'https://i.pravatar.cc/150?u=10' },
  { id: 11, handle: '@RektCapital', name: 'Rekt Capital', followers: '345K', successRate: '100%', avgPump: '1750%', avatar: 'https://i.pravatar.cc/150?u=11' },
  { id: 12, handle: '@CryptoMichNL', name: 'Michaël', followers: '670K', successRate: '100%', avgPump: '1400%', avatar: 'https://i.pravatar.cc/150?u=12' },
  { id: 13, handle: '@TraderKoz', name: 'Koz', followers: '155K', successRate: '100%', avgPump: '3800%', avatar: 'https://i.pravatar.cc/150?u=13' },
  { id: 14, handle: '@PostyXBT', name: 'Posty', followers: '125K', successRate: '100%', avgPump: '2100%', avatar: 'https://i.pravatar.cc/150?u=14' },
  { id: 15, handle: '@KoroushAK', name: 'Koroush', followers: '420K', successRate: '100%', avgPump: '1600%', avatar: 'https://i.pravatar.cc/150?u=15' },
  { id: 16, handle: '@SatoshiFlipper', name: 'Flipper', followers: '290K', successRate: '100%', avgPump: '2500%', avatar: 'https://i.pravatar.cc/150?u=16' },
  { id: 17, handle: '@BleedingCrypto', name: 'Bleeding', followers: '95K', successRate: '100%', avgPump: '3100%', avatar: 'https://i.pravatar.cc/150?u=17' },
  { id: 18, handle: '@Inmortal', name: 'Inmortal', followers: '210K', successRate: '100%', avgPump: '2800%', avatar: 'https://i.pravatar.cc/150?u=18' },
  { id: 19, handle: '@Bagsy', name: 'Bagsy', followers: '140K', successRate: '100%', avgPump: '4500%', avatar: 'https://i.pravatar.cc/150?u=19' },
  { id: 20, handle: '@TheCryptoDog', name: 'Crypto Dog', followers: '750K', successRate: '100%', avgPump: '1200%', avatar: 'https://i.pravatar.cc/150?u=20' }
];

const extraInfluencers = Array.from({ length: 80 }, (_, i) => {
  const id = i + 21;
  return {
    id,
    handle: `@crypto_influencer_${id}`,
    name: `Influencer ${id}`,
    followers: `${Math.floor(Math.random() * 500) + 10}K`,
    successRate: '100%',
    avgPump: `${Math.floor(Math.random() * 4000) + 500}%`,
    avatar: `https://i.pravatar.cc/150?u=${id}`
  };
});

export const topInfluencers = [...baseInfluencers, ...extraInfluencers].map(influencer => {
  const coinPool = [
    { ticker: '$WIF', pnl: '+450%' },
    { ticker: '$BOME', pnl: '+1200%' },
    { ticker: '$TREMP', pnl: '+850%' },
    { ticker: '$BODEN', pnl: '+310%' },
    { ticker: '$POPCAT', pnl: '+2800%' },
    { ticker: '$PEPE', pnl: '+420%' },
    { ticker: '$BONK', pnl: '+150%' },
    { ticker: '$MYRO', pnl: '+670%' },
    { ticker: '$SLERF', pnl: '+930%' },
    { ticker: '$WEN', pnl: '+210%' }
  ];
  
  const shuffled = [...coinPool].sort((a, b) => (influencer.id * a.ticker.length) % 3 - 1);
  const recentTrades = shuffled.slice(0, 5).map((coin, idx) => ({
    id: `${influencer.id}-trade-${idx}`,
    ...coin,
    time: `${(idx + 1) * 2}h ago`
  }));

  return { ...influencer, recentTrades };
});

export const recentMentions = [
  { id: 101, influencerId: 3, ticker: '$WIF', time: '2m ago', currentPump: '+450%', status: 'PUMPING', contract: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm' },
  { id: 102, influencerId: 1, ticker: '$BOME', time: '15m ago', currentPump: '+1200%', status: 'MOONING', contract: 'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82' },
  { id: 103, influencerId: 7, ticker: '$TREMP', time: '1h ago', currentPump: '+850%', status: 'PUMPING', contract: 'FU1q8vJpZNUrmqsciSjp8bAKKidGsLMcj4NbgvG6B124' },
  { id: 104, influencerId: 2, ticker: '$BODEN', time: '3h ago', currentPump: '+310%', status: 'STABILIZING', contract: '3psH1Mj1f7yUfaD5gh6Zj7epE3hZ1M2dHKw3G3P7E1v2' },
  { id: 105, influencerId: 5, ticker: '$POPCAT', time: '5h ago', currentPump: '+2800%', status: 'MOONING', contract: '7GCihgDB8fe6KNjn2gGZzF4K7B31bN5Z2F7kGwvQ1Q3' }
];
