import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

type Song = {
  id: string;
  title: string;
  artist: string;
};

export default function AddSongPage() {
  const [title, setTitle] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [savedSongs, setSavedSongs] = useState<Song[]>([]);
  const [learningSongs, setLearningSongs] = useState<Song[]>([]);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tuner' | 'search' | 'songbook' | 'create'>('search');
  const [songbookSubTab, setSongbookSubTab] = useState<'favorites' | 'saved'>('favorites');
  const [showSignup, setShowSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type?: 'success' | 'error' | 'info' }>>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'favorite' | 'saved'; song: Song } | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [viewingSong, setViewingSong] = useState<Song | null>(null);
  const [songTuning, setSongTuning] = useState("");
  const [songNotes, setSongNotes] = useState("");
  const [isLoadingSongDetails, setIsLoadingSongDetails] = useState(false);
  const [favoritesSearchQuery, setFavoritesSearchQuery] = useState("");
  const [savedSearchQuery, setSavedSearchQuery] = useState("");
  const [favoritesSortBy, setFavoritesSortBy] = useState<'recent' | 'artist' | 'tuning'>('recent');
  const [savedSortBy, setSavedSortBy] = useState<'recent' | 'artist' | 'tuning'>('recent');

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3500);
  };

  // load current user on mount and set up persistent session
  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      try {
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setUser(session?.user ?? null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    };
    loadUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // fetch saved and learning lists for current user
  const fetchLists = async (userId: string) => {
    try {
      console.debug('fetchLists: attempting relational select for saved_songs');
      const { data: savedData, error: savedError } = await supabase
        .from("saved_songs")
        .select("song_id, songs(id, title, artist)")
        .eq("user_id", userId);

      if (savedError) {
        console.debug('fetchLists: saved_songs relational select error', savedError.message);
      }

      if (savedData && Array.isArray(savedData)) {
        const first = savedData[0];
        if (first && 'songs' in first) {
          setSavedSongs(savedData.map((r: any) => {
            const s = r.songs;
            return { id: s.id || s.song_id, title: s.title, artist: s.artist };
          }));
        } else if (first && ('song_id' in first || 'id' in first) && 'title' in first) {
          setSavedSongs((savedData as any[]).map(s => ({ id: s.song_id || s.id, title: s.title, artist: s.artist })));
        } else {
          console.debug('fetchLists: savedData unexpected shape, falling back to id-only fetch');
          const ids = (savedData as any[]).map((r: any) => r.song_id).filter(Boolean);
          if (ids.length === 0) setSavedSongs([]);
          else {
            const { data: songsData, error: songsErr } = await supabase
              .from('songs')
              .select('id, title, artist')
              .in('id', ids);
            if (songsErr) {
              console.error('Error fetching songs for saved ids:', songsErr.message);
              setSavedSongs([]);
            } else {
              setSavedSongs((songsData || []).map((s: any) => ({ id: s.id || s.song_id, title: s.title, artist: s.artist })));
            }
          }
        }
      } else if (savedError && savedError.message && savedError.message.includes('Could not find a relationship')) {
        console.debug('fetchLists: relationship missing for saved_songs, doing id fetch');
        const { data: savedRows, error: savedRowsErr } = await supabase
          .from('saved_songs')
          .select('song_id')
          .eq('user_id', userId);
        if (savedRowsErr) {
          console.error('Error fetching saved song ids:', savedRowsErr.message);
          setSavedSongs([]);
        } else {
          const ids = (savedRows || []).map((r: any) => r.song_id).filter(Boolean);
          if (ids.length === 0) setSavedSongs([]);
          else {
            const { data: songsData, error: songsErr } = await supabase
              .from('songs')
              .select('id, title, artist')
              .in('id', ids);
            if (songsErr) {
              console.error('Error fetching songs for saved ids:', songsErr.message);
              setSavedSongs([]);
            } else {
              setSavedSongs(songsData || []);
            }
          }
        }
      }

      console.debug('fetchLists: attempting relational select for learning_songs');
      const { data: learningData, error: learningError } = await supabase
        .from("learning_songs")
        .select("song_id, songs(id, title, artist)")
        .eq("user_id", userId);

      if (learningData && Array.isArray(learningData)) {
        const first = learningData[0];
        if (first && 'songs' in first) {
          setLearningSongs(learningData.map((r: any) => {
            const s = r.songs;
            return { id: s.id || s.song_id, title: s.title, artist: s.artist };
          }));
        } else if (first && ('song_id' in first || 'id' in first) && 'title' in first) {
          setLearningSongs((learningData as any[]).map(s => ({ id: s.id || s.song_id, title: s.title, artist: s.artist })));
        } else {
          const ids = (learningData as any[]).map((r: any) => r.song_id).filter(Boolean);
          if (ids.length === 0) setLearningSongs([]);
          else {
            const { data: songsData, error: songsErr } = await supabase
              .from('songs')
              .select('id, title, artist')
              .in('id', ids);
            if (songsErr) {
              console.error('Error fetching songs for learning ids:', songsErr.message);
              setLearningSongs([]);
            } else {
              setLearningSongs((songsData || []).map((s: any) => ({ id: s.id || s.song_id, title: s.title, artist: s.artist })));
            }
          }
        }
      } else if (learningError && learningError.message && learningError.message.includes('Could not find a relationship')) {
        console.debug('fetchLists: relationship missing for learning_songs, doing id fetch');
        const { data: learningRows, error: learningRowsErr } = await supabase
          .from('learning_songs')
          .select('song_id')
          .eq('user_id', userId);
        if (learningRowsErr) {
          console.error('Error fetching learning song ids:', learningRowsErr.message);
          setLearningSongs([]);
        } else {
          const ids = (learningRows || []).map((r: any) => r.song_id).filter(Boolean);
          if (ids.length === 0) setLearningSongs([]);
          else {
            const { data: songsData, error: songsErr } = await supabase
              .from('songs')
              .select('id, title, artist')
              .in('id', ids);
            if (songsErr) {
              console.error('Error fetching songs for learning ids:', songsErr.message);
              setLearningSongs([]);
            } else {
              setLearningSongs(songsData || []);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Unexpected error in fetchLists:', err?.message ?? err);
    }
  };

  useEffect(() => {
    if (user && user.id) fetchLists(user.id);
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoginError(error.message);
      setUser(null);
    } else {
      setUser(data.user ?? null);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      setLoginError(error.message);
      setUser(null);
    } else {
      if (data?.user) {
        setUser(data.user);
      } else {
        setLoginError("Signup successful — please check your email to confirm your account.");
      }
    }
  };

  const handleLogout = async () => {
    setConfirmLogout(true);
  };

  const confirmLogoutAction = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSavedSongs([]);
    setLearningSongs([]);
    setConfirmLogout(false);
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTitle(value);
    if (value.length === 0) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    const { data, error } = await supabase
      .from("songs")
      .select("id, title, artist")
      .ilike("title", `%${value}%`);
    if (error) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setResults(
      (data as any[] || []).map((song) => ({
        id: song.id || song.song_id,
        title: song.title,
        artist: song.artist,
      }))
    );
    setShowDropdown((data && data.length > 0) || false);
  };

  const handleSelect = (song: Song) => {
    setTitle(song.title);
    setShowDropdown(false);
  };

  const performImmediateAction = async (type: 'save' | 'learn', song: Song) => {
    if (!user?.id) { addToast('Please log in to perform this action.', 'info'); return; }
    if (!song?.id) { addToast('Song id missing — cannot complete action.', 'error'); return; }
    try {
      if (type === 'save') {
        if (savedSongs.find(s => s.id === song.id)) { addToast('Song already saved for later.', 'info'); return; }

        if (learningSongs.find(s => s.id === song.id)) {
          const { error: delErr } = await supabase.from('learning_songs').delete().match({ user_id: user.id, song_id: song.id });
          if (delErr) {
            addToast('Error moving song from Favorites: ' + delErr.message, 'error');
            return;
          }
        }

        const { error } = await supabase.from('saved_songs').insert([{ user_id: user.id, song_id: song.id }]);
        if (error) addToast('Error saving song for later: ' + error.message, 'error');
        else { await fetchLists(user.id); addToast('Song saved for later!', 'success'); }
      } else {
        if (learningSongs.find(s => s.id === song.id)) { addToast('Song already in Favorites.', 'info'); return; }

        if (savedSongs.find(s => s.id === song.id)) {
          const { error: delErr } = await supabase.from('saved_songs').delete().match({ user_id: user.id, song_id: song.id });
          if (delErr) {
            addToast('Error moving song from Saved: ' + delErr.message, 'error');
            return;
          }
        }

        const { error } = await supabase.from('learning_songs').insert([{ user_id: user.id, song_id: song.id }]);
        if (error) addToast('Error adding to Favorites: ' + error.message, 'error');
        else { await fetchLists(user.id); addToast('Song added to Favorites!', 'success'); }
      }
    } catch (err: any) {
      console.error('Unexpected action error:', err);
      addToast('Unexpected error: ' + (err?.message ?? err), 'error');
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowDropdown(false), 150);
  };

  const handleInputFocus = () => {
    if (results && results.length > 0) setShowDropdown(true);
  };

  const loadSongDetails = async (song: Song) => {
    if (!user?.id || !song?.id) return;
    setIsLoadingSongDetails(true);
    try {
      // Check if song details exist in learning_songs or saved_songs
      const { data: learningData } = await supabase
        .from('learning_songs')
        .select('tuning, notes')
        .match({ user_id: user.id, song_id: song.id })
        .single();
      
      const { data: savedData } = await supabase
        .from('saved_songs')
        .select('tuning, notes')
        .match({ user_id: user.id, song_id: song.id })
        .single();
      
      const details = learningData || savedData;
      setSongTuning(details?.tuning || '');
      setSongNotes(details?.notes || '');
    } catch (err) {
      console.error('Error loading song details:', err);
      setSongTuning('');
      setSongNotes('');
    } finally {
      setIsLoadingSongDetails(false);
    }
  };

  const saveSongDetails = async () => {
    if (!user?.id || !viewingSong?.id) return;
    try {
      // Check which table the song is in
      const { data: learningData } = await supabase
        .from('learning_songs')
        .select('id')
        .match({ user_id: user.id, song_id: viewingSong.id })
        .single();
      
      const { data: savedData } = await supabase
        .from('saved_songs')
        .select('id')
        .match({ user_id: user.id, song_id: viewingSong.id })
        .single();
      
      if (learningData) {
        const { error } = await supabase
          .from('learning_songs')
          .update({ tuning: songTuning, notes: songNotes })
          .match({ user_id: user.id, song_id: viewingSong.id });
        if (error) throw error;
      } else if (savedData) {
        const { error } = await supabase
          .from('saved_songs')
          .update({ tuning: songTuning, notes: songNotes })
          .match({ user_id: user.id, song_id: viewingSong.id });
        if (error) throw error;
      }
      
      addToast('Song details saved!', 'success');
      setViewingSong(null);
    } catch (err: any) {
      console.error('Error saving song details:', err);
      addToast('Error saving details: ' + (err?.message || 'Unknown error'), 'error');
    }
  };

  const handleSongClick = async (song: Song) => {
    setViewingSong(song);
    await loadSongDetails(song);
  };

  // Song Item Component
  const SongItem = ({ song, type }: { song: Song; type: 'favorite' | 'saved' }) => {
    return (
      <li
        className={`group relative bg-card border border-border rounded-lg p-2.5 hover:border-${type === 'favorite' ? 'primary' : 'secondary'}/50 hover:shadow-md transition-all cursor-pointer`}
        onClick={() => handleSongClick(song)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-foreground truncate">{song.title}</div>
            <div className="text-xs text-muted-foreground truncate">{song.artist}</div>
          </div>
          <button
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
            aria-label={`Remove from ${type === 'favorite' ? 'favorites' : 'saved'}`}
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete({ type, song });
            }}
          >
            <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </li>
    );
  };

  const filterAndSortSongs = (songs: Song[], searchQuery: string, sortBy: 'recent' | 'artist' | 'tuning') => {
    let filtered = songs;
    
    // Filter by search query
    if (searchQuery.trim()) {
      filtered = songs.filter(song => 
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort
    let sorted = [...filtered];
    switch (sortBy) {
      case 'artist':
        sorted.sort((a, b) => a.artist.localeCompare(b.artist));
        break;
      case 'tuning':
        // TODO: Will need to fetch tuning data for proper sorting
        break;
      case 'recent':
      default:
        // Keep original order (most recent first from database)
        break;
    }
    
    return sorted;
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen bg-[#0f0f1a] flex flex-col">
      <div className="flex-1 overflow-auto pb-20">
        <div className="max-w-md mx-auto space-y-4 px-2 pt-4">
          <div className="flex flex-col items-center justify-center space-y-4">
            {user && (
              <div className="w-full flex items-center justify-between mb-4">
                <h1 className="text-xl font-semibold text-foreground">
                  {activeTab === 'tuner' && '🎵 Tuner'}
                  {activeTab === 'search' && '🔍 Search Songs'}
                  {activeTab === 'songbook' && '📖 Your Songbook'}
                  {activeTab === 'create' && '✍️ Create'}
                </h1>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Log out"
                >
                  <svg className="w-6 h-6 text-muted-foreground hover:text-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}
            {!user && (
              <div className="w-full flex items-center justify-center mb-6">
                <h1 className="text-3xl font-bold text-foreground">🎸 Songbook</h1>
              </div>
            )}
            
            {!user ? (
            <div className="w-full bg-card rounded-2xl shadow-2xl p-8 border border-border">
              {showSignup ? (
                <form onSubmit={handleSignup} className="space-y-4">
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Create Account</h2>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    autoComplete="username"
                    className="h-12"
                    required
                  />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="new-password"
                    className="h-12"
                    required
                  />
                  <Button type="submit" className="w-full h-12 text-lg">Sign Up</Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => { setShowSignup(false); setLoginError(null); }}>
                    Already have an account? Log in
                  </Button>
                  {loginError && <div className="text-destructive text-sm mt-2 p-3 bg-destructive/10 rounded-lg">{loginError}</div>}
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Welcome Back</h2>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    autoComplete="username"
                    className="h-12"
                    required
                  />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    className="h-12"
                    required
                  />
                  <Button type="submit" className="w-full h-12 text-lg">Log In</Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setShowSignup(true)}>
                    Don't have an account? Sign up
                  </Button>
                  {loginError && <div className="text-destructive text-sm mt-2 p-3 bg-destructive/10 rounded-lg">{loginError}</div>}
                </form>
              )}
            </div>
          ) : (
            <>
              <div className="bg-card rounded-xl p-4 shadow-lg border border-border relative">
                {activeTab === 'tuner' && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Tuner feature coming soon...</p>
                  </div>
                )}

                {activeTab === 'search' && (
                  <div>
                    <div className="relative">
                      <Input
                        value={title}
                        onChange={handleChange}
                        onBlur={handleInputBlur}
                        onFocus={handleInputFocus}
                        placeholder="Search for songs..."
                        autoComplete="off"
                        className="h-14 text-lg pl-12 pr-4"
                      />
                      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    
                    {showDropdown && (
                      <div onMouseLeave={() => setShowDropdown(false)} className="absolute left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-2xl mt-6 max-h-80 overflow-auto">
                        {results.map((song, idx) => (
                          <div
                            key={song.id || idx}
                            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border last:border-0"
                            onClick={() => handleSelect(song)}
                          >
                            <div className="flex-1">
                              <div className="font-semibold text-foreground">{song.title}</div>
                              <div className="text-sm text-muted-foreground">{song.artist}</div>
                            </div>
                            <div className="flex gap-3 ml-4" onClick={e => e.stopPropagation()}>
                              <button
                                className={`p-2 rounded-lg transition-colors ${learningSongs.find(s => s.id === song.id) ? 'bg-primary/20 text-primary' : 'hover:bg-primary/10 text-muted-foreground hover:text-primary'}`}
                                title="Add to Favorites"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!user?.id) { addToast('Please log in to save songs.', 'info'); return; }
                                  if (!song.id) { addToast('Song id missing — please try again or refresh the list.', 'error'); return; }
                                  performImmediateAction('learn', song);
                                }}
                              >
                                <svg className="w-5 h-5" fill={learningSongs.find(s => s.id === song.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                              </button>

                              <button
                                className={`p-2 rounded-lg transition-colors ${savedSongs.find(s => s.id === song.id) ? 'bg-secondary/20 text-secondary' : 'hover:bg-secondary/10 text-muted-foreground hover:text-secondary'}`}
                                title="Save for Later"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!user?.id) { addToast('Please log in to save songs.', 'info'); return; }
                                  if (!song.id) { addToast('Song id missing — please try again or refresh the list.', 'error'); return; }
                                  performImmediateAction('save', song);
                                }}
                              >
                                <svg className="w-5 h-5" fill={savedSongs.find(s => s.id === song.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                        {results.length === 0 && (
                          <div className="px-4 py-6 text-muted-foreground text-center">No songs found</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'songbook' && (
                  <div className="space-y-3">
                    <div className="flex gap-2 bg-muted/30 rounded-lg p-1">
                      <button
                        className={`flex-1 px-4 py-2 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${songbookSubTab === 'favorites' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setSongbookSubTab('favorites')}
                      >
                        <svg className="w-4 h-4" fill={songbookSubTab === 'favorites' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        Favorites
                      </button>
                      <button
                        className={`flex-1 px-4 py-2 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${songbookSubTab === 'saved' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setSongbookSubTab('saved')}
                      >
                        <svg className="w-4 h-4" fill={songbookSubTab === 'saved' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        Saved for Later
                      </button>
                    </div>

                    {songbookSubTab === 'favorites' && (
                      <div className="mt-2">
                        <div className="space-y-2 mb-3">
                          <div className="relative">
                            <Input
                              value={favoritesSearchQuery}
                              onChange={(e) => setFavoritesSearchQuery(e.target.value)}
                              placeholder="Search favorites..."
                              className="h-10 pl-9 pr-4"
                            />
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <select
                            value={favoritesSortBy}
                            onChange={(e) => setFavoritesSortBy(e.target.value as any)}
                            className="w-full h-10 px-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            style={{ backgroundColor: '#1a1a2e', color: '#ffffff' }}
                          >
                            <option value="recent" style={{ backgroundColor: '#1a1a2e', color: '#ffffff' }}>Sort by: Recently Added</option>
                            <option value="artist" style={{ backgroundColor: '#1a1a2e', color: '#ffffff' }}>Sort by: Artist</option>
                            <option value="tuning" style={{ backgroundColor: '#1a1a2e', color: '#ffffff' }}>Sort by: Tuning</option>
                          </select>
                        </div>
                        {learningSongs.length === 0 ? (
                          <div className="text-muted-foreground text-center py-12">No favorites yet. Start searching!</div>
                        ) : filterAndSortSongs(learningSongs, favoritesSearchQuery, favoritesSortBy).length === 0 ? (
                          <div className="text-muted-foreground text-center py-8">No songs match your search.</div>
                        ) : (
                          <ul className="space-y-1.5">
                            {filterAndSortSongs(learningSongs, favoritesSearchQuery, favoritesSortBy).map((song) => (
                              <SongItem key={song.id} song={song} type="favorite" />
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {songbookSubTab === 'saved' && (
                      <div className="mt-2">
                        <div className="space-y-2 mb-3">
                          <div className="relative">
                            <Input
                              value={savedSearchQuery}
                              onChange={(e) => setSavedSearchQuery(e.target.value)}
                              placeholder="Search saved songs..."
                              className="h-10 pl-9 pr-4"
                            />
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <select
                            value={savedSortBy}
                            onChange={(e) => setSavedSortBy(e.target.value as any)}
                            className="w-full h-10 px-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            style={{ backgroundColor: '#1a1a2e', color: '#ffffff' }}
                          >
                            <option value="recent" style={{ backgroundColor: '#1a1a2e', color: '#ffffff' }}>Sort by: Recently Added</option>
                            <option value="artist" style={{ backgroundColor: '#1a1a2e', color: '#ffffff' }}>Sort by: Artist</option>
                            <option value="tuning" style={{ backgroundColor: '#1a1a2e', color: '#ffffff' }}>Sort by: Tuning</option>
                          </select>
                        </div>
                        {savedSongs.length === 0 ? (
                          <div className="text-muted-foreground text-center py-12">No songs saved for later yet.</div>
                        ) : filterAndSortSongs(savedSongs, savedSearchQuery, savedSortBy).length === 0 ? (
                          <div className="text-muted-foreground text-center py-8">No songs match your search.</div>
                        ) : (
                          <ul className="space-y-1.5">
                            {filterAndSortSongs(savedSongs, savedSearchQuery, savedSortBy).map((song) => (
                              <SongItem key={song.id} song={song} type="saved" />
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'create' && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Song creation feature coming soon...</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={
                `px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm ${t.type === 'success' ? 'bg-green-500/90 text-white' : t.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-primary/90 text-white'}`
              }
            >
              {t.message}
            </div>
          ))}
        </div>

        {/* Confirmation Dialog */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
              <h3 className="text-xl font-semibold text-foreground">Remove Song?</h3>
              <div className="space-y-2">
                <p className="text-foreground font-medium">{confirmDelete.song.title}</p>
                <p className="text-sm text-muted-foreground">{confirmDelete.song.artist}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to remove this song from {confirmDelete.type === 'favorite' ? 'Favorites' : 'Saved'}?
              </p>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setConfirmDelete(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
                  onClick={async () => {
                    if (!user?.id) { 
                      addToast('Please log in to remove songs.', 'info'); 
                      setConfirmDelete(null);
                      return; 
                    }
                    if (!confirmDelete.song.id) { 
                      addToast('Song id missing.', 'error'); 
                      setConfirmDelete(null);
                      return; 
                    }
                    
                    const table = confirmDelete.type === 'favorite' ? 'learning_songs' : 'saved_songs';
                    const { error } = await supabase
                      .from(table)
                      .delete()
                      .match({ user_id: user.id, song_id: confirmDelete.song.id });
                    
                    if (error) {
                      addToast(`Error removing from ${confirmDelete.type === 'favorite' ? 'favorites' : 'saved'}: ` + error.message, 'error');
                    } else {
                      await fetchLists(user.id);
                      addToast(`Removed from ${confirmDelete.type === 'favorite' ? 'Favorites' : 'Saved'}`, 'success');
                    }
                    setConfirmDelete(null);
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Logout Confirmation Dialog */}
        {confirmLogout && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
              <h3 className="text-xl font-semibold text-foreground">Log Out?</h3>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to log out of your account?
              </p>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setConfirmLogout(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
                  onClick={confirmLogoutAction}
                >
                  Log Out
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Song Details Modal */}
        {viewingSong && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground">{viewingSong.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{viewingSong.artist}</p>
                </div>
                <button
                  onClick={() => setViewingSong(null)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {isLoadingSongDetails ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Tuning</label>
                    <Input
                      value={songTuning}
                      onChange={(e) => setSongTuning(e.target.value)}
                      placeholder="e.g., Standard, Drop D, DADGAD"
                      className="h-10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Notes</label>
                    <textarea
                      value={songNotes}
                      onChange={(e) => setSongNotes(e.target.value)}
                      placeholder="Add any notes about this song..."
                      className="w-full min-h-[120px] px-3 py-2 rounded-lg border border-input bg-[#0f0f1a] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 resize-y"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={() => setViewingSong(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={saveSongDetails}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Bottom Navigation */}
      {user && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0f0f1a] border-t border-border shadow-2xl z-40 pb-safe">
          <div className="max-w-md mx-auto flex items-start justify-around h-20 px-4 pt-3">
            <button
              className={`flex flex-col items-center justify-start flex-1 py-1 transition-all ${activeTab === 'tuner' ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('tuner')}
            >
              <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span className="text-[10px] font-medium">Tuner</span>
            </button>
            
            <button
              className={`flex flex-col items-center justify-start flex-1 py-1 transition-all ${activeTab === 'search' ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('search')}
            >
              <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-[10px] font-medium">Search</span>
            </button>
            
            <button
              className={`flex flex-col items-center justify-start flex-1 py-1 transition-all ${activeTab === 'songbook' ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('songbook')}
            >
              <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-[10px] font-medium">Your Songbook</span>
            </button>
            
            <button
              className={`flex flex-col items-center justify-start flex-1 py-1 transition-all ${activeTab === 'create' ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('create')}
            >
              <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px] font-medium">Create</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

