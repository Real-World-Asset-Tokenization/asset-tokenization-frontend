export function isAssetOwnedByUser(asset, user) {
  const userId = user?._id || user?.id || user?.userId;
  const ownerId = asset.ownerId?._id || asset.ownerId;
  return Boolean(userId && ownerId && String(userId) === String(ownerId));
}
