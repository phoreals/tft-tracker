"use client";

import React, { useState } from 'react';
import styles from './Dashboard.module.css'; // Fixed the CSS path here!
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { RefreshCw, UserPlus, UserMinus, Clock } from 'lucide-react';

export default function Home() {
  const [isUpdating, setIsUpdating] = useState(false);

  // Combined Excel Data + Placeholder for Live Data
  const [players, setPlayers] = useState([
    { id: 1, name: "Dan", riotId: "Banh#boi", wk1Games: 60, wk2Games: 116, wk2Rank: "EM4 86 LP", livePlaytime: 145000 },
    { id: 2, name: "Steven", riotId: "Richardpression#SAD", wk1Games: 48, wk2Games: 85, wk2Rank: "EM4 53 LP", livePlaytime: 102000 },
    { id: 3, name: "Leon", riotId: "Lionnel#NA1", wk1Games: 25, wk2Games: 44, wk2Rank: "PL3 93 LP", livePlaytime: 68000 },
    { id: 4, name: "DV", riotId: "FireLordAppa#1335", wk1Games: 0, wk2Games: 69, wk2Rank: "PL2 16 LP", livePlaytime: 81000 },
    { id: 5, name: "Leon #2", riotId: "V for Taehyung#NA1", wk1Games: 0, wk2Games: 29, wk2Rank: "PL4 8 LP", livePlaytime: 35000 },
    { id: 6, name: "Ronel", riotId: "Caramel Papi#PAPI1", wk1Games: 29, wk2Games: 68, wk2Rank: "EM3 83 LP", livePlaytime: 90000 },
    { id: 7, name: "Andy", riotId: "demure#ggez", wk1Games: 43, wk2Games: 62, wk2Rank: "EM3 87 LP", livePlaytime: 85000 }
  ]);

  const stats = {
    totalPlaytimeSecs: players.reduce((acc, p) => acc + p.livePlaytime, 0),
    gamesPerRank: [
      { name: 'Platinum', games: 167 },
      { name: 'Emerald', games: 331 },
      { name: 'Diamond', games: 12 }
    ],
    gamesPerDay: [
      { date: 'Mon', games: 15 }, { date: 'Tue', games: 42 }, { date: 'Wed', games: 28 },
      { date: 'Thu', games: 35 }, { date: 'Fri', games: 65 }, { date: 'Sat', games: 82 }, { date: 'Sun', games: 55 }
    ]
  };

  const formatPlaytime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const days = (hrs / 24).toFixed(1);
    const secs = seconds % 60;
    return `${hrs}h ${secs}s (${days} days)`;
  };

  const handleManualUpdate = async () => {
    setIsUpdating(true);
    try {
      await fetch('/api/updateStats', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    setIsUpdating(false);
  };

  return (
    <div className={styles.container}>
      {/* Removed the <Head> block entirely from here */}
      
      {/* Header & Controls */}
      <header className={styles.header}>
        <h1 className={styles.title}>TFT Squad Tracker</h1>
        <div className={styles.controls}>
          <button className={`${styles.btn} ${styles.btnAdd}`}>
            <UserPlus size={18} /> Add Player
          </button>
          <button 
            className={`${styles.btn} ${styles.btnSync}`} 
            onClick={handleManualUpdate}
            disabled={isUpdating}
          >
            <RefreshCw size={18} className={isUpdating ? "spinning" : ""} />
            {isUpdating ? "Syncing..." : "Update Live Data"}
          </button>
        </div>
      </header>

      {/* Aggregate Stats Bar */}
      <div className={styles.gridTop}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}><Clock size={18}/> Squad Playtime</h3>
          <p className={styles.cardValue}>{formatPlaytime(stats.totalPlaytimeSecs)}</p>
        </div>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Top Achieved Rank</h3>
          <p className={styles.cardValue} style={{color: '#c084fc'}}>Emerald 3 (Ronel)</p>
        </div>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Total Squad Games</h3>
          <p className={styles.cardValue} style={{color: '#34d399'}}>473</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className={styles.gridCharts}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Games Played Per Day</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={stats.gamesPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                <Bar dataKey="games" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Games Played by Rank Tier</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={stats.gamesPerRank} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                <Bar dataKey="games" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Roster & Database Table */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Roster & Historical Stats</h3>
        <div className={styles.tableContainer}>
          <table className={styles.rosterTable}>
            <thead>
              <tr>
                <th>Player</th>
                <th>Riot ID</th>
                <th>Wk 1 Games</th>
                <th>Wk 2 Games</th>
                <th>Wk 2 Rank</th>
                <th>Total Playtime</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id}>
                  <td className={styles.playerName}>{player.name}</td>
                  <td>{player.riotId}</td>
                  <td>{player.wk1Games || '-'}</td>
                  <td>{player.wk2Games}</td>
                  <td className={styles.playerRank}>{player.wk2Rank}</td>
                  <td>{formatPlaytime(player.livePlaytime)}</td>
                  <td>
                    <button className={styles.actionBtn} title="Remove Player">
                      <UserMinus size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}