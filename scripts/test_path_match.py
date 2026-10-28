import cv2
import numpy as np

# Load crop_password_sneaky.png
img = cv2.imread('design/crop_password_sneaky.png')
h, w, _ = img.shape

# Ground truth purple mask
mask_gt_p = (img[:,:,0] > 180) & (img[:,:,2] > 70) & (img[:,:,2] < 120) & (img[:,:,1] < 50)

# Let's test a bezier curve rasterization
# In SVG:
# Left curve: from (162, 488) up to (153, 332) then C (160, 230), (210, 110), (309, 22)
# Top edge: L (426, 147)
# Right curve: C (385, 210), (350, 310), (349, 488)
# Bottom: L (162, 488)

def eval_cubic(p0, p1, p2, p3, n=50):
    t = np.linspace(0, 1, n).reshape(-1, 1)
    pts = (1-t)**3 * p0 + 3*(1-t)**2*t * p1 + 3*(1-t)*t**2 * p2 + t**3 * p3
    return pts

# Left curve
c1 = eval_cubic(np.array([153, 332]), np.array([160, 210]), np.array([215, 100]), np.array([309, 22]), 60)
# Top edge
c2 = np.linspace(np.array([309, 22]), np.array([426, 147]), 30)
# Right curve
c3 = eval_cubic(np.array([426, 147]), np.array([380, 210]), np.array([344, 300]), np.array([349, 488]), 60)
# Bottom edge & lower-left
c4 = np.array([[162, 488], [153, 332]])

poly = np.vstack([c1, c2, c3, c4]).astype(np.int32)

mask_test_p = np.zeros((h, w), dtype=np.uint8)
cv2.fillPoly(mask_test_p, [poly], 1)

# Compare only above orange (y < 330) where purple is visible
visible_region = (np.arange(h)[:, None] < 330)
gt_sub = mask_gt_p & visible_region
test_sub = (mask_test_p > 0) & visible_region

intersection = np.sum(gt_sub & test_sub)
union = np.sum(gt_sub | test_sub)
iou = intersection / union
print(f"Purple Sneaky Bezier IoU (Intersection over Union): {iou:.4f} (Accuracy: {iou*100:.2f}%)")

# Save overlay visual
overlay = img.copy()
cv2.polylines(overlay, [poly], True, (0, 255, 0), 2)
cv2.imwrite('design/test_purple_overlay.png', overlay)
print("Overlay written to design/test_purple_overlay.png")
