import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGame } from '../context/GameContext';
import { useToast } from '../context/ToastContext';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import {
  AchievementsPanel,
  ActivityTimeline,
  ContinueJourney,
  HouseCard,
  MagicalProgress,
  OwlPostPanel,
  SubjectsGrid,
  WelcomeSection,
} from '../components/dashboard/panels';
import { HOUSE_BY_CLASS } from '../lib/dashboardData';

/**
 * The Great Hall — the first screen after signing in.
 *
 * Real data comes from `useGame().character`: the name, rank, level,
 * experience, streak and Galleons are all live, and the house is derived from
 * the class the player chose at the Sorting. Lessons, subjects, achievements,
 * activity and Owl Post are placeholders from `lib/dashboardData`, shaped the
 * way an endpoint would return them.
 */

const UNSORTED_HOUSE = {
  key: 'hogwarts',
  name: 'Not yet sorted',
  blurb: 'Visit the Sorting to be placed in a house and start earning points.',
  points: 0,
  rank: 4,
};

export default function Dashboard() {
  const { character } = useGame();
  const toast = useToast();
  const navigate = useNavigate();

  const house = HOUSE_BY_CLASS[character?.characterClass] ?? UNSORTED_HOUSE;

  // The quest board is the closest thing to a lesson player this build has,
  // so "continue" hands off to it rather than dead-ending on a toast.
  const onContinue = useCallback(() => navigate('/play'), [navigate]);

  const onOpenSubject = useCallback(
    (subject) => {
      toast.info(`${subject.name} — lesson pages are still being written.`);
    },
    [toast],
  );

  const onOpenAward = useCallback(
    (award) => {
      if (award.unlocked) toast.success(`${award.name} — earned.`);
      else toast.info(`${award.name}: ${award.hint}`);
    },
    [toast],
  );

  return (
    <DashboardShell>
      <WelcomeSection
        name={character?.displayName?.split(' ')[0] ?? 'Wanderer'}
        rank={character?.rank}
        level={character?.level}
      />

      <div className="dash-grid">
        <div className="dash-span">
          <ContinueJourney onContinue={onContinue} />
        </div>

        <MagicalProgress character={character} housePoints={house.points} />
        <HouseCard house={house} />

        <div className="dash-span">
          <SubjectsGrid onOpen={onOpenSubject} />
        </div>

        <ActivityTimeline />

        <div className="grid gap-[clamp(0.85rem,1.6vw,1.15rem)]">
          <AchievementsPanel onOpen={onOpenAward} />
          <OwlPostPanel />
        </div>
      </div>
    </DashboardShell>
  );
}
