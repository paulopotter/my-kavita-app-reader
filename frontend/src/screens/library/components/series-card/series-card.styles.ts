import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: '#16213E',
    borderRadius: 8,
    overflow: 'hidden',
  },
  // Bookmark-style: flush to right edge, 6dp from top, rounded on the left only.
  starBookmark: {
    position: 'absolute',
    top: 6,
    right: 0,
    paddingLeft: 6,
    paddingRight: 4,
    paddingTop: 4,
    paddingBottom: 6,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  cover: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#0F3460',
  },
  info: {
    padding: 8,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#0F3460',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E94560',
    borderRadius: 2,
  },
  progressLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressText: {
    color: '#A0AEC0',
    fontSize: 10,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  badgePub: { backgroundColor: '#553C9A' },
  badgeError: { backgroundColor: '#C53030' },
  chapters: {
    color: '#A0AEC0',
    fontSize: 10,
  },
});
