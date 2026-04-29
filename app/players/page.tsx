"use client";

import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { UserPlus, Users, Trash2, RefreshCw, DatabaseZap, Lock } from "lucide-react";
import { motion } from "motion/react";
import { GlassCard } from "@/components/GlassCard";
import { formatRank, formatRankAbbr, getRankColor } from "@/lib/utils";
import { theme } from "@/styles/theme";

// ── Styled ───────────────────────────────────────────────────────

const LockScreen = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
`;

const LockForm = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.lg};
  width: 100%;
  max-width: 320px;
`;

const LockTitle = styled.h2`
  ${({ theme }) => theme.semantic.typography.heading};
  font-size: ${({ theme }) => theme.primitive.fontSize.xl};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.sm};
`;

const LockInput = styled.input`
  width: 100%;
  background: ${({ theme }) => theme.component.input.bg};
  border: none;
  border-bottom: 2px solid ${({ theme }) => theme.component.input.borderColor};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  padding: ${({ theme }) => theme.primitive.spacing.sm} 0;
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.lg};
  text-align: center;
  letter-spacing: 0.1em;
  transition: border-color 0.2s;
  outline: none;

  &:focus {
    border-bottom-color: ${({ theme }) => theme.component.input.focusBorderColor};
  }

  &::placeholder {
    color: ${({ theme }) => theme.semantic.color.textDisabled};
    font-size: ${({ theme }) => theme.primitive.fontSize.md};
    letter-spacing: 0;
  }
`;

const LockError = styled.p`
  color: ${({ theme }) => theme.semantic.color.danger};
  font-size: ${({ theme }) => theme.semantic.typography.label.fontSize};
  font-family: ${({ theme }) => theme.semantic.font.display};
`;

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing.lg};
  padding: ${({ theme }) => theme.primitive.spacing.lg} 0;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    gap: ${({ theme }) => theme.primitive.spacing.xl};
    padding: ${({ theme }) => theme.primitive.spacing.xl} 0;
  }
`;

const PageTitle = styled.h1`
  ${({ theme }) => theme.semantic.typography.heading};
  font-size: ${({ theme }) => theme.primitive.fontSize["2xl"]};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  margin-bottom: ${({ theme }) => theme.primitive.spacing.xs};
  overflow-wrap: break-word;
  word-break: break-word;

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    font-size: ${({ theme }) => theme.primitive.fontSize["3xl"]};
  }

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.lg}) {
    font-size: ${({ theme }) => theme.primitive.fontSize["4xl"]};
  }
`;

const PageDescription = styled.p`
  font-family: ${({ theme }) => theme.semantic.font.body};
  color: ${({ theme }) => theme.semantic.color.textSecondary};
  max-width: 640px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.primitive.spacing.sm};

  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.lg}) {
    grid-template-columns: 4fr 8fr;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing.sm};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing.lg};
`;

const FieldLabel = styled.label`
  ${({ theme }) => theme.semantic.typography.label};
  font-size: ${({ theme }) => theme.primitive.fontSize["2xs"]};
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  display: block;
  margin-bottom: ${({ theme }) => theme.primitive.spacing.xs};
`;

const Input = styled.input`
  width: 100%;
  background: ${({ theme }) => theme.component.input.bg};
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.component.input.borderColor};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  padding: ${({ theme }) => theme.primitive.spacing.xs} 0;
  font-family: ${({ theme }) => theme.semantic.font.display};
  transition: border-color 0.2s;
  outline: none;

  &:focus {
    border-bottom-color: ${({ theme }) => theme.component.input.focusBorderColor};
  }

  &::placeholder {
    color: ${({ theme }) => theme.semantic.color.textDisabled};
  }
`;

const ErrorText = styled.p`
  color: ${({ theme }) => theme.semantic.color.danger};
  font-size: ${({ theme }) => theme.semantic.typography.label.fontSize};
  font-family: ${({ theme }) => theme.semantic.font.display};
`;

const PrimaryButton = styled.button`
  width: 100%;
  background: ${({ theme }) => theme.semantic.color.accent};
  color: ${({ theme }) => theme.semantic.color.bgPrimary};
  ${({ theme }) => theme.semantic.typography.label};
  padding: ${({ theme }) => theme.primitive.spacing.md} 0;
  border: none;
  border-radius: ${({ theme }) => theme.primitive.radius.md};
  cursor: pointer;
  transition: filter 0.2s;
  box-shadow: ${({ theme }) => theme.semantic.shadow.buttonGold};

  &:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;


const SeedDescription = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.semantic.color.textMuted};
  line-height: 1.6;
  margin-bottom: ${({ theme }) => theme.primitive.spacing.md};
`;

const SeedButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  ${({ theme }) => theme.semantic.typography.label};
  padding: 12px 0;
  background: ${({ theme }) => theme.component.glassCard.bg};
  backdrop-filter: blur(${({ theme }) => theme.component.glassCard.backdropBlur});
  border: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  border-radius: ${({ theme }) => theme.primitive.radius.md};
  box-shadow: ${({ theme }) => theme.component.glassCard.shadow};
  color: ${({ theme }) => theme.semantic.color.info};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.semantic.color.borderInfo};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SyncBadge = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  ${({ theme }) => theme.semantic.typography.data};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  background: ${({ theme }) => theme.semantic.color.borderDim};
  padding: ${({ theme }) => theme.primitive.spacing["2xs"]} ${({ theme }) => theme.primitive.spacing.sm};
  border-radius: ${({ theme }) => theme.primitive.radius.sm};
  border: 1px solid ${({ theme }) => theme.semantic.color.borderDim};
  text-transform: uppercase;
  color: ${({ theme }) => theme.semantic.color.info};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.semantic.color.borderInfo};
  }

  &:disabled {
    opacity: 0.5;
  }
`;

const PlayerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing.sm};
  flex: 1;
  overflow-y: auto;
  max-height: min(600px, 55vh);
  padding-right: 8px;
`;

const PlayerRow = styled(motion.div)<{ $elite: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.primitive.spacing.md};
  background: ${({ theme }) => theme.component.table.headerBg};
  border: 1px solid ${({ $elite, theme }) =>
    $elite ? theme.semantic.color.borderDefault : theme.semantic.color.borderDim};
  border-radius: ${({ theme }) => theme.primitive.radius.lg};
  transition: all 0.2s;

  /* only translate on pointer devices to avoid touch overflow */
  @media (hover: hover) {
    &:hover {
      border-color: ${({ $elite, theme }) =>
        $elite ? theme.semantic.color.borderHover : theme.semantic.color.borderInfo};
      transform: translateX(4px);
    }
  }
`;

const PlayerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.md};
`;

const Avatar = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.primitive.radius.md};
  border: 2px solid ${({ $color }) => $color};
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.3);
  transition: border-color 0.2s;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const PlayerName = styled.span`
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-weight: ${({ theme }) => theme.primitive.fontWeight.bold};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
`;

const PlayerTag = styled.span`
  ${({ theme }) => theme.semantic.typography.data};
  font-size: ${({ theme }) => theme.semantic.typography.label.fontSize};
  color: ${({ theme }) => theme.semantic.color.textDisabled};
`;

const PlayerMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  margin-top: ${({ theme }) => theme.primitive.spacing["2xs"]};
`;

const TierLabel = styled.span<{ $color: string }>`
  ${({ theme }) => theme.semantic.typography.label};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  color: ${({ $color }) => $color};
`;

const RankFull = styled.span`
  display: none;
  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: inline;
  }
`;

const RankAbbr = styled.span`
  @media (min-width: ${({ theme }) => theme.primitive.breakpoint.md}) {
    display: none;
  }
`;

const Dot = styled.span`
  width: ${({ theme }) => theme.primitive.spacing["2xs"]};
  height: ${({ theme }) => theme.primitive.spacing["2xs"]};
  border-radius: ${({ theme }) => theme.primitive.radius.full};
  background: ${({ theme }) => theme.primitive.color.neutral700};
`;

const WinLoss = styled.span`
  ${({ theme }) => theme.semantic.typography.data};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  color: ${({ theme }) => theme.semantic.color.textDisabled};
`;

const DeleteButton = styled.button`
  padding: ${({ theme }) => theme.primitive.spacing.sm};
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.9);
  transition: all 0.2s;

  ${PlayerRow}:hover & {
    opacity: 1;
    transform: scale(1);
  }

  /* Always visible on touch devices */
  @media (hover: none) {
    opacity: 0.5;
    transform: scale(1);
  }

  &:hover {
    color: ${({ theme }) => theme.semantic.color.danger};
  }
`;

const EmptyState = styled.div`
  padding: ${({ theme }) => theme.primitive.spacing["2xl"]} 0;
  text-align: center;
  color: ${({ theme }) => theme.semantic.color.textDisabled};
  font-family: ${({ theme }) => theme.semantic.font.display};
  font-size: ${({ theme }) => theme.primitive.fontSize.md};
`;

// ── Types & Constants ────────────────────────────────────────────

interface PlayerData {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIconId?: number;
  current: {
    tier: string;
    rank: string;
    lp: number;
    wins: number;
    losses: number;
  } | null;
}

const HIGH_TIERS = new Set(["DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"]);

// ── Component ────────────────────────────────────────────────────

const ADMIN_PASSWORD = "asylum";

export default function ManagePlayersPage() {
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("tft-admin") === "1") setAuthed(true);
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthed(true);
      sessionStorage.setItem("tft-admin", "1");
      setPasswordError("");
    } else {
      setPasswordError("Wrong password.");
    }
  };

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch("/api/players");
      const data = await res.json();
      setPlayers(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { if (authed) fetchPlayers(); }, [authed, fetchPlayers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameName.trim() || !tagLine.trim()) return;

    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameName: gameName.trim(), tagLine: tagLine.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to add player"); }
      else { setGameName(""); setTagLine(""); await fetchPlayers(); }
    } catch (err) { setError(err instanceof Error ? err.message : "Network error. Please try again."); }
    finally { setAdding(false); }
  };

  const handleRemove = async (puuid: string) => {
    try {
      await fetch(`/api/players/${puuid}`, { method: "DELETE" });
      setPlayers((prev) => prev.filter((p) => p.puuid !== puuid));
    } catch { /* silent */ }
  };

  const handleSync = async () => {
    setSyncing(true);
    try { await fetch("/api/sync", { method: "POST" }); await fetchPlayers(); }
    catch { /* silent */ }
    finally { setSyncing(false); }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setError("");
    setSeedProgress("");
    try {
      // Get player list
      const listRes = await fetch("/api/seed");
      const listData = await listRes.json();
      if (!listRes.ok) { setError(listData.error ?? "Seed failed"); setSeeding(false); return; }

      const total = listData.players.length;
      for (let i = 0; i < total; i++) {
        const p = listData.players[i];
        setSeedProgress(`Seeding ${p.gameName}#${p.tagLine} (${i + 1}/${total})...`);
        const res = await fetch("/api/seed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ index: i }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(`Failed on ${p.gameName}#${p.tagLine}: ${data.error}`);
          break;
        }
        if (data.results?.[0]?.error) {
          // Non-fatal — player failed but continue with others
          setSeedProgress(`${p.gameName}#${p.tagLine} failed, continuing...`);
        }
      }
      await fetchPlayers();
      setSeedProgress("");
    } catch (err) { setError(err instanceof Error ? err.message : "Seed failed. Network error."); }
    finally { setSeeding(false); }
  };

  if (!authed) {
    return (
      <LockScreen>
        <GlassCard>
          <LockForm onSubmit={handlePasswordSubmit}>
            <LockTitle>
              <Lock size={24} color={theme.semantic.color.accent} />
              ADMIN ACCESS
            </LockTitle>
            <LockInput
              type="password"
              placeholder="Enter password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
            />
            {passwordError && <LockError>{passwordError}</LockError>}
            <PrimaryButton type="submit">UNLOCK</PrimaryButton>
          </LockForm>
        </GlassCard>
      </LockScreen>
    );
  }

  return (
    <Page>
      <div>
        <PageTitle>Manage Players</PageTitle>
        <PageDescription>
          Add or remove players to track. Data syncs automatically daily via cron, or use Sync Now for on-demand updates.
        </PageDescription>
      </div>

      <Grid>
        <LeftColumn>
          <GlassCard title="ADD SUMMONER" icon={UserPlus}>
            <form onSubmit={handleAdd}>
              <FormGroup>
                <div>
                  <FieldLabel>RIOT ID</FieldLabel>
                  <Input
                    placeholder="e.g. Hide on bush"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    disabled={adding}
                  />
                </div>
                <div>
                  <FieldLabel>TAGLINE</FieldLabel>
                  <Input
                    placeholder="e.g. NA1"
                    value={tagLine}
                    onChange={(e) => setTagLine(e.target.value)}
                    disabled={adding}
                  />
                </div>
                {error && <ErrorText>{error}</ErrorText>}
                <PrimaryButton
                  type="submit"
                  disabled={adding || !gameName.trim() || !tagLine.trim()}
                >
                  {adding ? "ADDING..." : "ADD PLAYER"}
                </PrimaryButton>
              </FormGroup>
            </form>
          </GlassCard>

          {players.length === 0 && (
            <GlassCard title="SEED SQUAD" icon={DatabaseZap}>
              <SeedDescription>
                Load the squad: Banh#boi, Richardpression#SAD, Lionnel#NA1,
                FireLordAppa#1335, V for Taehyung#NA1, Caramel Papi#PAPI1,
                Demure#GGEZ, Nisca#CREAM, Goldeen#NA1, MrBonChen#NA1
              </SeedDescription>
              <SeedButton onClick={handleSeed} disabled={seeding}>
                <DatabaseZap size={16} style={seeding ? { animation: "pulse 2s infinite" } : undefined} />
                {seeding ? (seedProgress || "STARTING...") : "LOAD THE ASYLUM"}
              </SeedButton>
            </GlassCard>
          )}
        </LeftColumn>

        <GlassCard
          title="TRACKED PLAYERS"
          icon={Users}
          headerAction={
            <SyncBadge onClick={handleSync} disabled={syncing}>
              <RefreshCw size={12} style={syncing ? { animation: "spin 1s linear infinite" } : undefined} />
              {syncing ? "Syncing..." : "Sync Now"}
            </SyncBadge>
          }
        >
          <PlayerList>
            {players.length === 0 ? (
              <EmptyState>No players tracked yet. Add a summoner to get started.</EmptyState>
            ) : (
              players.map((player) => {
                const isElite = HIGH_TIERS.has(player.current?.tier ?? "");
                const rankColor = getRankColor(player.current?.tier);
                return (
                  <PlayerRow key={player.puuid} $elite={isElite}>
                    <PlayerInfo>
                      <Avatar $color={rankColor}>
                        {player.profileIconId ? (
                          <img
                            src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${player.profileIconId}.jpg`}
                            alt={player.gameName}
                          />
                        ) : (
                          <div style={{ width: "100%", height: "100%", background: rankColor + "22" }} />
                        )}
                      </Avatar>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: theme.primitive.spacing.xs }}>
                          <PlayerName>{player.gameName}</PlayerName>
                          <PlayerTag>#{player.tagLine}</PlayerTag>
                        </div>
                        <PlayerMeta>
                          <TierLabel $color={rankColor}>
                            {player.current ? (
                              <>
                                <RankFull>{formatRank(player.current.tier, player.current.rank, player.current.lp)}</RankFull>
                                <RankAbbr>{formatRankAbbr(player.current.tier, player.current.rank, player.current.lp)}</RankAbbr>
                              </>
                            ) : "UNRANKED"}
                          </TierLabel>
                          {player.current && (
                            <>
                              <Dot />
                              <WinLoss>{player.current.wins}W {player.current.losses}L</WinLoss>
                            </>
                          )}
                        </PlayerMeta>
                      </div>
                    </PlayerInfo>
                    <DeleteButton onClick={() => handleRemove(player.puuid)}>
                      <Trash2 size={20} />
                    </DeleteButton>
                  </PlayerRow>
                );
              })
            )}
          </PlayerList>
        </GlassCard>
      </Grid>
    </Page>
  );
}
