"use client";

import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { UserPlus, Users, Trash2, DatabaseZap, Lock } from "lucide-react";
import { motion } from "motion/react";
import { GlassCard } from "@/components/GlassCard";
import { formatRank, formatRankAbbr, getRankColor } from "@/lib/utils";
import { RankEmblem, RankText } from "@/components/RankDisplay";
import { theme, ICON_SIZE } from "@/styles/theme";

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
  padding: ${({ theme }) => theme.primitive.spacing.sm} ${({ theme }) => theme.primitive.spacing.sm};
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

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    gap: ${({ theme }) => theme.primitive.spacing.xl};
    padding: ${({ theme }) => theme.primitive.spacing.xl} 0;
  }

  @container content (min-width: ${({ theme }) => theme.primitive.container.lg}) {
    /* border-box includes Page's own padding in the height.
       Only subtract Content's padding-bottom so the total stack = 100dvh. */
    box-sizing: border-box;
    height: calc(100dvh - ${({ theme }) => theme.primitive.spacing.xl});
    overflow: hidden;
  }
`;

const PageTitle = styled.h1`
  ${({ theme }) => theme.semantic.typography.heading};
  font-size: ${({ theme }) => theme.primitive.fontSize["3xl"]};
  color: ${({ theme }) => theme.semantic.color.textPrimary};
  margin-bottom: ${({ theme }) => theme.primitive.spacing.xs};
  overflow-wrap: break-word;
  word-break: break-word;

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    font-size: ${({ theme }) => theme.primitive.fontSize["4xl"]};
  }
`;

const PageDescription = styled.p`
  font-family: ${({ theme }) => theme.semantic.font.body};
  font-size: ${({ theme }) => theme.primitive.fontSize.lg};
  color: ${({ theme }) => theme.semantic.color.textMuted};
  margin-top: ${({ theme }) => theme.primitive.spacing["2xs"]};
`;

const Grid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing.sm};

  @container content (min-width: ${({ theme }) => theme.primitive.container.lg}) {
    flex-direction: row;
    flex: 1;
    min-height: 0;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing.sm};

  @container content (min-width: ${({ theme }) => theme.primitive.container.lg}) {
    flex: 4;
    align-self: flex-start;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing.lg};
`;

const FieldLabel = styled.label`
  ${({ theme }) => theme.semantic.typography.label};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
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
  padding: ${({ theme }) => theme.primitive.spacing.xs} ${({ theme }) => theme.primitive.spacing.sm};
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
  border-radius: ${({ theme }) => theme.semantic.radius.control};
  cursor: pointer;
  transition: filter 0.2s;
  box-shadow: ${({ theme }) => theme.semantic.shadow.buttonGold};

  &:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  &:active:not(:disabled) {
    filter: brightness(0.85);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.semantic.color.accent};
    outline-offset: 2px;
  }
`;


const SeedDescription = styled.p`
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
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
  padding: ${({ theme }) => theme.primitive.spacing.sm} 0;
  background: ${({ theme }) => theme.component.glassCard.bg};
  -webkit-backdrop-filter: blur(${({ theme }) => theme.semantic.blur.card});
  backdrop-filter: blur(${({ theme }) => theme.semantic.blur.card});
  border: 1px solid ${({ theme }) => theme.semantic.color.borderDefault};
  border-radius: ${({ theme }) => theme.semantic.radius.control};
  box-shadow: ${({ theme }) => theme.component.glassCard.shadow};
  color: ${({ theme }) => theme.semantic.color.info};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.semantic.color.borderInfo};
  }

  &:active:not(:disabled) {
    background: ${({ theme }) => theme.semantic.color.accentBgSubtle};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.semantic.color.accent};
    outline-offset: 2px;
  }
`;


const PlayerList = styled.div<{ $scrolled: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.primitive.spacing.xs};
  flex: 1;
  overflow-y: auto;
  max-height: min(600px, 55vh);

  /* Flush scrollbar against card edges */
  margin-left: -${({ theme }) => theme.primitive.spacing.sm};
  margin-right: -${({ theme }) => theme.primitive.spacing.sm};
  padding-left: ${({ theme }) => theme.primitive.spacing.sm};
  padding-right: ${({ theme }) => theme.primitive.spacing.sm};

  /* Top shadow when scrolled */
  border-top: 1px solid ${({ $scrolled, theme }) =>
    $scrolled ? theme.semantic.color.borderDefault : "transparent"};
  transition: border-color 0.2s, box-shadow 0.2s;
  box-shadow: ${({ $scrolled }) =>
    $scrolled ? "inset 0 6px 8px -6px rgba(0, 0, 0, 0.25)" : "none"};

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    gap: ${({ theme }) => theme.primitive.spacing.sm};
    margin-left: -${({ theme }) => theme.component.glassCard.padding};
    margin-right: -${({ theme }) => theme.component.glassCard.padding};
    padding-left: ${({ theme }) => theme.component.glassCard.padding};
    padding-right: ${({ theme }) => theme.component.glassCard.padding};
  }

  @container content (min-width: ${({ theme }) => theme.primitive.container.lg}) {
    max-height: none;
    min-height: 0;
  }
`;

const PlayerRow = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.primitive.spacing.xs} ${({ theme }) => theme.primitive.spacing.sm};
  background: ${({ theme }) => theme.component.table.headerBg};
  border: 1px solid ${({ theme }) => theme.semantic.color.borderDim};
  border-radius: ${({ theme }) => theme.semantic.radius.control};
  transition: all 0.2s;

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    padding: ${({ theme }) => theme.primitive.spacing.sm} ${({ theme }) => theme.primitive.spacing.md};
    border-radius: ${({ theme }) => theme.semantic.radius.card};
  }

  /* only translate on pointer devices to avoid touch overflow */
  @media (hover: hover) {
    &:hover {
      border-color: ${({ theme }) => theme.semantic.color.borderHover};
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
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.semantic.radius.control};
  border: 2px solid ${({ $color }) => $color};
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.3);
  transition: border-color 0.2s;

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    width: 48px;
    height: 48px;
  }

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
  font-size: ${({ theme }) => theme.primitive.fontSize.sm};
  color: ${({ theme }) => theme.semantic.color.textPrimary};

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    font-size: ${({ theme }) => theme.primitive.fontSize.md};
  }
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
  margin-top: 2px;

  @container content (min-width: ${({ theme }) => theme.primitive.container.md}) {
    margin-top: ${({ theme }) => theme.primitive.spacing["2xs"]};
  }
`;

const TierLabel = styled.span<{ $color: string }>`
  ${({ theme }) => theme.semantic.typography.label};
  font-size: ${({ theme }) => theme.primitive.fontSize.xs};
  color: ${({ $color }) => $color};
`;


const Dot = styled.span`
  width: ${({ theme }) => theme.primitive.spacing["2xs"]};
  height: ${({ theme }) => theme.primitive.spacing["2xs"]};
  border-radius: ${({ theme }) => theme.semantic.radius.pill};
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

  &:active {
    background: ${({ theme }) => theme.semantic.color.accentBgSubtle};
  }

  &:focus-visible {
    opacity: 1;
    transform: scale(1);
    outline: 2px solid ${({ theme }) => theme.semantic.color.danger};
    outline-offset: 2px;
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
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState("");
  const [listScrolled, setListScrolled] = useState(false);
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
              <Lock size={ICON_SIZE.lg} color={theme.semantic.color.accent} />
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
          <GlassCard title="Add Summoner" icon={UserPlus}>
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
            <GlassCard title="Seed Squad" icon={DatabaseZap}>
              <SeedDescription>
                Load the squad: Banh#boi, Richardpression#SAD, Lionnel#NA1,
                FireLordAppa#1335, V for Taehyung#NA1, Caramel Papi#PAPI1,
                Demure#GGEZ, Nisca#CREAM, Goldeen#NA1, MrBonChen#NA1
              </SeedDescription>
              <SeedButton onClick={handleSeed} disabled={seeding}>
                <DatabaseZap size={ICON_SIZE.md} style={seeding ? { animation: "pulse 2s infinite" } : undefined} />
                {seeding ? (seedProgress || "STARTING...") : "LOAD THE ASYLUM"}
              </SeedButton>
            </GlassCard>
          )}
        </LeftColumn>

        <GlassCard
          title="Tracked Players"
          icon={Users}
          style={{ flex: 8, minHeight: 0 }}
        >
          <PlayerList
            $scrolled={listScrolled}
            onScroll={(e) => setListScrolled(e.currentTarget.scrollTop > 2)}
          >
            {players.length === 0 ? (
              <EmptyState>No players tracked yet. Add players to get started.</EmptyState>
            ) : (
              players.map((player) => {
                const rankColor = getRankColor(player.current?.tier);
                return (
                  <PlayerRow key={player.puuid}>
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
                          {player.current?.tier && (
                            <RankEmblem tier={player.current.tier} size={14} color={rankColor} />
                          )}
                          <TierLabel $color={rankColor}>
                            {player.current ? (
                              <RankText
                                full={formatRank(player.current.tier, player.current.rank, player.current.lp)}
                                abbr={formatRankAbbr(player.current.tier, player.current.rank, player.current.lp)}
                              />
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
                    <DeleteButton
                      onClick={() => handleRemove(player.puuid)}
                      aria-label={`Remove ${player.gameName}`}
                    >
                      <Trash2 size={ICON_SIZE.nav} />
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
