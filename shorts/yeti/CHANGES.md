
## 15 Nov 2026 11:05
Make it look more like a yeti, it looks like a bear

## 15 Nov 2026 20:45
The yeti model is crooked fix it, also it’s walking so make the continuous and moving at the yeti speed

## 15 Nov 2026 22:05
The yeti model is still crooked
Fix 16 Nov: dropped the stray flat shoulder sheet (faces on the clavicle/upper-arm twist bones) that made the yeti look crooked.

- 2026-11-16 09:45 fix (Claude): fur was drawn see-through (pale sheet on back), now cut out; shoulders held to idle pose so the walk no longer folds a flap; two shots moved off the left edge.
- 2026-11-16 11:30 fix (Claude): real cause of the shoulder clipping found. The model's right upper-arm twist bone keeps a broken rest offset (1.6 m off the shoulder) that no clip resets, so it dragged the right shoulder skin into a sheet in every pose. It is now pinned where its left twin sits; the earlier shoulder hold is gone, so the arms swing naturally again.
