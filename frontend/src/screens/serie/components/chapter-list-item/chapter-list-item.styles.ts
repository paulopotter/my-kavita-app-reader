import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#16213E',
  },
  zebra: { backgroundColor: '#1A1A2E' },
  read: { opacity: 0.5 },
  selected: { backgroundColor: '#0F3460' },
  checkbox: { width: 24, alignItems: 'center', justifyContent: 'center' },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#A0AEC0',
  },
  checkboxBoxChecked: {
    backgroundColor: '#E94560',
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
  title: { color: '#FFFFFF', fontSize: 14, marginLeft: 8, flex: 1 },
  titleRead: { color: '#A0AEC0' },
  titleSelected: { color: '#FFFFFF', fontWeight: '600' },
});
