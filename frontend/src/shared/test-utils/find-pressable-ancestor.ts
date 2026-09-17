// Test-only helper: given a react-test-renderer element (e.g. from UNSAFE_getByType(SomeIcon)),
// walks up its parent chain to the nearest ancestor of the given pressable type (TouchableOpacity,
// Pressable, …). Useful when a button renders an icon component instead of a <Text> label — there's
// no text to query by, so tests target the icon and need its enclosing pressable to fire the press.
export function findPressableAncestor(element: { type: unknown; parent: unknown } | null, pressableType: unknown): unknown {
  let node = element;
  while (node && (node as { type: unknown }).type !== pressableType) {
    node = (node as { parent: { type: unknown; parent: unknown } | null }).parent;
  }
  if (!node) {
    throw new Error('findPressableAncestor: no ancestor of the given pressable type was found');
  }
  return node;
}
