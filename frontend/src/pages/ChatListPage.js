import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageCircle, Star } from 'lucide-react';
import AppLayout from '../layouts/AppLayout';
import { EmptyState, SkeletonList, Avatar, PageHeader } from '../components/ui/UIKit';
import RatingModal from '../components/ui/RatingModal';
import api from '../utils/api';

const sp = { type: 'spring', stiffness: 300, damping: 28 };

function ChatRow({ room, index, total, formatTime, onClick, onRate }) {
  const [hovered, setHovered] = useState(false);
  const hasRating = room.myRating;

  return (
    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
      transition={{ ...sp, delay: index * 0.05 }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: index < total - 1 ? '1px solid #2D2653' : 'none', minHeight: 72, background: hovered ? '#231E42' : 'transparent', transition: 'background 0.15s' }}>

      <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }} onClick={onClick}>
        <Avatar name={room.other?.name} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#F1F0F7', margin: 0 }}>{room.other?.name || 'SideKick'}</p>
              {room.metBefore && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#FBBF24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 6, padding: '1px 6px' }}>Met Before</span>
              )}
            </div>
            <span style={{ fontSize: 12, color: '#6E6893', flexShrink: 0, marginLeft: 8 }}>{formatTime(room.lastMessage?.createdAt)}</span>
          </div>
          <p style={{ fontSize: 13, color: '#6E6893', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
            {room.lastMessage?.content || 'Start the conversation!'}
          </p>
          {hasRating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3 }}>
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={10} fill={s <= room.myRating ? '#FBBF24' : 'none'} color={s <= room.myRating ? '#FBBF24' : '#433B72'} />
              ))}
              <span style={{ fontSize: 11, color: '#6E6893', marginLeft: 2 }}>Your rating</span>
            </div>
          )}
        </div>
      </div>

      {/* Rate button */}
      <motion.button whileTap={{ scale: 0.9 }} onClick={onRate}
        style={{ flexShrink: 0, height: 32, padding: '0 12px', borderRadius: 10, background: hasRating ? 'rgba(251,191,36,0.1)' : '#2D2653', border: `1px solid ${hasRating ? 'rgba(251,191,36,0.3)' : '#433B72'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: hasRating ? '#FBBF24' : '#A8A3C7' }}>
        <Star size={12} fill={hasRating ? '#FBBF24' : 'none'} color={hasRating ? '#FBBF24' : '#A8A3C7'} />
        {hasRating ? room.myRating + '/5' : 'Rate'}
      </motion.button>
    </motion.div>
  );
}

export default function ChatListPage() {
  const [rooms, setRooms]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [focused, setFocused]     = useState(false);
  const [ratingModal, setRatingModal] = useState(null); // { matchId, otherUser, existingReview }
  const navigate = useNavigate();

  const fetchRooms = async () => {
    try {
      const { data } = await api.get('/chats/rooms');
      const rooms = data.rooms || [];
      // Fetch my review for each match
      const enriched = await Promise.all(rooms.map(async (room) => {
        try {
          const { data: rd } = await api.get(`/users/my-review/${room.matchId}`);
          return { ...room, myRating: rd.review?.rating || null, existingReview: rd.review };
        } catch { return room; }
      }));
      setRooms(enriched);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchRooms(); }, []);

  const filtered = rooms.filter(r => r.other?.name?.toLowerCase().includes(search.toLowerCase()));

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (Date.now() - d < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return 'Yesterday';
  };

  return (
    <AppLayout>
      <PageHeader title="Messages" />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...sp, delay: 0.08 }}
        style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={16} color="#6E6893" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder="Search conversations..."
          style={{ width: '100%', height: 44, background: focused ? '#362F5E' : '#2D2653', border: `1.5px solid ${focused ? '#7C3AED' : '#433B72'}`, borderRadius: 14, paddingLeft: 40, paddingRight: 14, fontSize: 14, color: '#F1F0F7', fontFamily: 'Inter, sans-serif', outline: 'none', boxShadow: focused ? '0 0 0 3px rgba(124,58,237,0.3)' : 'none', transition: 'all 0.25s ease' }}
        />
      </motion.div>

      {loading && <SkeletonList count={4} height={72} />}

      {!loading && filtered.length === 0 && (
        <EmptyState icon={MessageCircle} title="No messages yet" subtitle="Match with someone to start chatting" action="Find Matches" onAction={() => navigate('/match')} />
      )}

      {!loading && filtered.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          style={{ background: '#1A1535', borderRadius: 20, border: '1px solid #2D2653', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
          {filtered.map((room, i) => (
            <ChatRow key={room.roomId} room={room} index={i} total={filtered.length} formatTime={formatTime}
              onClick={() => navigate(`/chat/${room.roomId}`)}
              onRate={() => setRatingModal({ matchId: room.matchId, otherUser: room.other, existingReview: room.existingReview })}
            />
          ))}
        </motion.div>
      )}

      {/* Rating Modal */}
      <AnimatePresence>
        {ratingModal && (
          <RatingModal
            matchId={ratingModal.matchId}
            otherUser={ratingModal.otherUser}
            existingReview={ratingModal.existingReview}
            onClose={(submitted) => {
              setRatingModal(null);
              if (submitted) fetchRooms();
            }}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
