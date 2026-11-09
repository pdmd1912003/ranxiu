import React, { useState, useEffect, useMemo } from 'react';
import { TopNav } from './components/TopNav';
import { LevelSelector } from './components/LevelSelector';
import { LessonTreeRoadmap } from './components/LessonTreeRoadmap';
import { PinyinChartRoom } from './components/PinyinChartRoom';
import { LessonDetailView, LessonTabType } from './components/LessonDetailView';
import { TeacherCreatorModal } from './components/TeacherCreatorModal';
import { EditItemModal, EditModalTarget } from './components/EditItemModal';
import { StrokeOrderModal } from './components/StrokeOrderModal';
import { TeacherLoginScreen } from './components/TeacherLoginScreen';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { YctPortalApp } from './yct/YctPortalApp';
import { LevelId, Lesson, FlashCard, ReadingText, TeacherSession } from './types';
import { LEVELS } from './data/curriculumData';
import {
  getAllLessons,
  updateReadingText,
  subscribeToFirestoreLessons,
  seedCurriculumToFirestore,
} from './utils/storage';
import {
  getTeacherSession,
  logoutTeacher,
  getActivePortal,
  setActivePortal,
  PortalType,
} from './utils/auth';
import { X, Cloud, RefreshCw } from 'lucide-react';

const NAV_STATE_KEY = 'ranxiu_last_view_state';

interface NavState {
  view: 'curriculum' | 'pinyin-chart' | 'lesson-tree' | 'lesson';
  levelId: LevelId;
  lessonId?: string;
  tab?: LessonTabType;
}

function getInitialNavState(): NavState {
  if (typeof window === 'undefined') {
    return { view: 'curriculum', levelId: 'hsk1', tab: 'vocab-list' };
  }

  // 1. URL search params (khi reload F5 hoặc mở link trực tiếp)
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get('view') as NavState['view'] | null;
  const levelParam = params.get('level') as LevelId | null;
  const lessonParam = params.get('lesson') || undefined;
  const tabParam = params.get('tab') as LessonTabType | null;

  if (viewParam) {
    return {
      view: viewParam,
      levelId: levelParam || 'hsk1',
      lessonId: lessonParam,
      tab: tabParam || 'vocab-list',
    };
  }

  // 2. LocalStorage lưu trạng thái lần gần nhất
  try {
    const saved = localStorage.getItem(NAV_STATE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.view) {
        return parsed;
      }
    }
  } catch (e) {
    //
  }

  return { view: 'curriculum', levelId: 'hsk1', tab: 'vocab-list' };
}

export default function App() {
  const initialNav = useMemo(() => getInitialNavState(), []);

  // Quản lý 2 trang độc lập hoàn toàn (HSK & YCT), chọn trang trước khi đăng nhập
  const [activePortal, setActivePortalState] = useState<PortalType | null>(() => {
    const savedPortal = getActivePortal();
    if (!savedPortal) return null;
    const session = getTeacherSession(savedPortal);
    return session ? savedPortal : null;
  });
  const [hskSession, setHskSession] = useState<TeacherSession | null>(() =>
    getTeacherSession('hsk')
  );
  const [yctSession, setYctSession] = useState<TeacherSession | null>(() =>
    getTeacherSession('yct')
  );

  const [isChangePassModalOpen, setIsChangePassModalOpen] = useState<boolean>(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [firebaseStatus, setFirebaseStatus] = useState<
    'connecting' | 'connected' | 'seeding' | 'offline'
  >('connecting');
  const [firebaseStatusDetail, setFirebaseStatusDetail] = useState<string>(
    'Đang kết nối Firebase...'
  );
  const [isSyncingManual, setIsSyncingManual] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<
    'curriculum' | 'pinyin-chart' | 'lesson-tree' | 'lesson'
  >(initialNav.view);
  const [activeLevelId, setActiveLevelId] = useState<LevelId>(initialNav.levelId);
  const [selectedLessonId, setSelectedLessonId] = useState<string | undefined>(
    initialNav.lessonId
  );
  const [initialLessonTab, setInitialLessonTab] = useState<LessonTabType>(
    initialNav.tab || 'vocab-list'
  );
  const [isSlideModeActive, setIsSlideModeActive] = useState<boolean>(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState<boolean>(false);
  const [teacherModalDefaultLevel, setTeacherModalDefaultLevel] = useState<LevelId>('hsk1');
  const [teacherModalDefaultLesson, setTeacherModalDefaultLesson] = useState<string | undefined>(
    undefined
  );
  const [editTarget, setEditTarget] = useState<EditModalTarget>(null);
  const [strokeChar, setStrokeChar] = useState<string | null>(null);

  // Chỉ đồng bộ URL và Firestore của trang HSK khi đang ở trang HSK
  useEffect(() => {
    if (activePortal !== 'hsk') return;
    const navState: NavState = {
      view: currentView,
      levelId: activeLevelId,
      lessonId: selectedLessonId,
      tab: initialLessonTab,
    };
    try {
      localStorage.setItem(NAV_STATE_KEY, JSON.stringify(navState));
    } catch {
      //
    }

    const params = new URLSearchParams();
    if (currentView !== 'curriculum') params.set('view', currentView);
    if (activeLevelId) params.set('level', activeLevelId);
    if (selectedLessonId && currentView === 'lesson') params.set('lesson', selectedLessonId);
    if (initialLessonTab && currentView === 'lesson') params.set('tab', initialLessonTab);

    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(navState, '', newUrl);
  }, [activePortal, currentView, activeLevelId, selectedLessonId, initialLessonTab]);

  // Hỗ trợ nút Back / Forward trên trình duyệt cho trang HSK
  useEffect(() => {
    if (activePortal !== 'hsk') return;
    const handlePopState = () => {
      const state = getInitialNavState();
      setCurrentView(state.view);
      setActiveLevelId(state.levelId);
      setSelectedLessonId(state.lessonId);
      if (state.tab) setInitialLessonTab(state.tab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activePortal]);

  // Load lessons from storage and subscribe to Firebase Firestore ONLY when inside HSK portal
  useEffect(() => {
    if (activePortal !== 'hsk') return;
    const loaded = getAllLessons();
    setLessons(loaded);

    const unsubscribe = subscribeToFirestoreLessons(
      (cloudLessons) => {
        setLessons(cloudLessons);
      },
      (status, detail) => {
        setFirebaseStatus(status);
        if (detail) setFirebaseStatusDetail(detail);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activePortal]);

  const handleManualSyncFirebase = async () => {
    setIsSyncingManual(true);
    setFirebaseStatus('seeding');
    setFirebaseStatusDetail('Đang đồng bộ lên Firebase Firestore...');
    const res = await seedCurriculumToFirestore(lessons.length > 0 ? lessons : getAllLessons());
    setIsSyncingManual(false);
    if (res.success) {
      setFirebaseStatus('connected');
      setFirebaseStatusDetail(`Đã đồng bộ ${res.count} bài học lên Firebase (ranxiu-hsk-app)`);
    } else {
      setFirebaseStatus('offline');
      setFirebaseStatusDetail(res.error || 'Chưa kết nối được Firestore');
    }
  };

  const handleSelectLevel = (lvlId: LevelId) => {
    setActiveLevelId(lvlId);
    setCurrentView('lesson-tree');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectLessonFromTree = (
    lesson: Lesson,
    defaultTab: LessonTabType = 'vocab-list'
  ) => {
    setSelectedLessonId(lesson.id);
    setInitialLessonTab(defaultTab);
    setCurrentView('lesson');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenPinyinChart = () => {
    setCurrentView('pinyin-chart');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoHome = () => {
    setCurrentView('curriculum');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleSlideMode = () => {
    setIsSlideModeActive((prev) => !prev);
  };

  const handleOpenTeacherModal = (lvlId?: LevelId, lessonId?: string) => {
    if (lvlId) {
      setTeacherModalDefaultLevel(lvlId);
    }
    setTeacherModalDefaultLesson(lessonId || selectedLessonId);
    setIsTeacherModalOpen(true);
  };

  const handleOpenEditCard = (card: FlashCard, levelId: LevelId, lessonId: string) => {
    setEditTarget({ type: 'flashcard', card, levelId, lessonId });
  };

  const handleOpenEditText = (readingText: ReadingText, levelId: LevelId, lessonId: string) => {
    setEditTarget({ type: 'reading', readingText, levelId, lessonId });
  };

  const handleRefreshLessons = (updated: Lesson[]) => {
    setLessons(updated);
  };

  const handleUpdateTextAudio = (
    levelId: LevelId,
    lessonId: string,
    textId: string,
    updatedFields: Partial<ReadingText>
  ) => {
    const updated = updateReadingText(levelId, lessonId, textId, updatedFields);
    setLessons(updated);
  };

  const currentLevelInfo = useMemo(
    () => LEVELS.find((l) => l.id === activeLevelId) || LEVELS[0],
    [activeLevelId]
  );
  const currentLevelLessons = useMemo(
    () => lessons.filter((l) => l.levelId === activeLevelId),
    [lessons, activeLevelId]
  );

  // 1. Chưa chọn trang hoặc chưa đăng nhập vào trang đã chọn -> Hiện màn hình Chọn Trang & Đăng Nhập
  const isPortalAuthenticated =
    (activePortal === 'hsk' && Boolean(hskSession)) ||
    (activePortal === 'yct' && Boolean(yctSession));

  if (!activePortal || !isPortalAuthenticated) {
    return (
      <TeacherLoginScreen
        onLoginSuccess={(session, chosenPortal) => {
          if (chosenPortal === 'yct') {
            setYctSession(session);
          } else {
            setHskSession(session);
          }
          setActivePortal(chosenPortal);
          setActivePortalState(chosenPortal);
        }}
      />
    );
  }

  // 2. Nếu giáo viên đã chọn và đăng nhập vào TRANG YCT -> Hiển thị độc lập hoàn toàn YctPortalApp
  if (activePortal === 'yct' && yctSession) {
    return (
      <YctPortalApp
        teacherSession={yctSession}
        onUpdateTeacherName={(newName) => {
          setYctSession((prev) => (prev ? { ...prev, teacherName: newName } : null));
        }}
        onLogout={() => {
          logoutTeacher('yct');
          setYctSession(null);
          setActivePortalState(null);
        }}
        onSwitchPortal={() => {
          logoutTeacher('yct');
          setYctSession(null);
          setActivePortalState(null);
        }}
      />
    );
  }

  // 3. Nếu giáo viên đã chọn và đăng nhập vào TRANG HSK -> Hiển thị độc lập hoàn toàn trang HSK
  const handleHskLogout = () => {
    logoutTeacher('hsk');
    setHskSession(null);
    setActivePortalState(null);
  };

  return (
    <div className="min-h-screen text-zinc-900 flex flex-col selection:bg-[#FCE7F3] selection:text-black">
      {/* Top Bar - Hidden when in Slide Mode */}
      {!isSlideModeActive && hskSession && (
        <TopNav
          currentView={currentView}
          activeLevelId={activeLevelId}
          onSelectLevel={handleSelectLevel}
          onOpenTeacherModal={() => handleOpenTeacherModal(activeLevelId)}
          onOpenPinyinChart={handleOpenPinyinChart}
          onGoHome={handleGoHome}
          isSlideModeActive={isSlideModeActive}
          onToggleSlideMode={handleToggleSlideMode}
          teacherName={hskSession.teacherName}
          onOpenChangePassword={() => setIsChangePassModalOpen(true)}
          onLogout={handleHskLogout}
        />
      )}

      {/* Floating Exit Button for Slide Mode */}
      {isSlideModeActive && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <button
            onClick={handleToggleSlideMode}
            className="cute-btn flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-xl text-xs font-black shadow-lg"
          >
            <X className="w-4 h-4" />
            <span>Thoát Slide Chiếu [Esc]</span>
          </button>
        </div>
      )}

      {/* Main View Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {currentView === 'curriculum' && (
          <LevelSelector
            lessons={lessons}
            onSelectLevel={handleSelectLevel}
            onOpenPinyinChart={handleOpenPinyinChart}
            onShowStroke={setStrokeChar}
          />
        )}

        {currentView === 'pinyin-chart' && (
          <PinyinChartRoom
            onBack={handleGoHome}
            onGoToLesson={() => {
              setActiveLevelId('pinyin');
              setCurrentView('lesson-tree');
            }}
            onShowStroke={setStrokeChar}
          />
        )}

        {currentView === 'lesson-tree' && (
          <LessonTreeRoadmap
            levelInfo={currentLevelInfo}
            lessons={currentLevelLessons}
            onBack={handleGoHome}
            onSelectLesson={handleSelectLessonFromTree}
            onOpenTeacherModal={(lvl) => handleOpenTeacherModal(lvl)}
            onShowStroke={setStrokeChar}
          />
        )}

        {currentView === 'lesson' && (
          <LessonDetailView
            levelInfo={currentLevelInfo}
            lessons={currentLevelLessons}
            initialLessonId={selectedLessonId}
            initialTab={initialLessonTab}
            onBack={() => setCurrentView('lesson-tree')}
            onSelectLessonChange={(id) => setSelectedLessonId(id)}
            onSelectTabChange={(tab) => setInitialLessonTab(tab)}
            onOpenTeacherModal={(lvl, lesId) => handleOpenTeacherModal(lvl, lesId)}
            onEditCard={handleOpenEditCard}
            onEditText={handleOpenEditText}
            onUpdateTextAudio={handleUpdateTextAudio}
            isSlideModeActive={isSlideModeActive}
            onToggleSlideMode={handleToggleSlideMode}
            onShowStroke={setStrokeChar}
          />
        )}
      </main>

      {/* Footer */}
      {!isSlideModeActive && (
        <footer className="border-t-2 border-black bg-white mt-12 py-6 text-xs text-zinc-600 font-bold">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-black text-black">Ranxiu</span>
              <span>· Giáo trình Tiếng Trung HSK</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-zinc-500 font-semibold text-[11px]">
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-black font-bold ${
                  firebaseStatus === 'connected'
                    ? 'bg-[#DCFCE7] text-black'
                    : firebaseStatus === 'seeding' || firebaseStatus === 'connecting'
                    ? 'bg-[#FAF6EE] text-black'
                    : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>{firebaseStatusDetail}</span>
              </div>

              <button
                onClick={handleManualSyncFirebase}
                disabled={isSyncingManual}
                className="cute-btn inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FCE7F3] hover:bg-pink-200 text-black border border-black font-black text-[11px]"
                title="Đẩy dữ liệu bài học lên Cloud Firestore"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingManual ? 'animate-spin' : ''}`} />
                <span>Đồng bộ Firebase</span>
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Teacher Custom Creator & Audio Management Modal */}
      <TeacherCreatorModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        lessons={lessons}
        onRefreshLessons={handleRefreshLessons}
        defaultLevelId={teacherModalDefaultLevel}
        defaultLessonId={teacherModalDefaultLesson || selectedLessonId}
      />

      {/* Edit Item Modal for Flashcards & Reading Texts */}
      <EditItemModal
        target={editTarget}
        isOpen={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        onRefreshLessons={handleRefreshLessons}
      />

      {/* Stroke Order Modal — click any Hán tự to open */}
      <StrokeOrderModal
        character={strokeChar}
        onClose={() => setStrokeChar(null)}
      />

      {/* Change Password & Teacher Profile Modal */}
      <ChangePasswordModal
        isOpen={isChangePassModalOpen}
        onClose={() => setIsChangePassModalOpen(false)}
        onNameUpdated={(newName) => {
          setHskSession((prev) => (prev ? { ...prev, teacherName: newName } : null));
        }}
      />
    </div>
  );
}
