import cv2
import numpy as np
from scipy.optimize import minimize

img = cv2.imread('design/crop_password_sneaky.png')
h, w, _ = img.shape

# Ground truth purple mask
mask_gt_p = (img[:,:,0] > 180) & (img[:,:,2] > 70) & (img[:,:,2] < 120) & (img[:,:,1] < 50)
visible_region = (np.arange(h)[:, None] < 330)
gt_sub = mask_gt_p & visible_region

def eval_cubic(p0, p1, p2, p3, n=60):
    t = np.linspace(0, 1, n).reshape(-1, 1)
    pts = (1-t)**3 * p0 + 3*(1-t)**2*t * p1 + 3*(1-t)*t**2 * p2 + t**3 * p3
    return pts

# We want to optimize control points:
# c1: from (153, 332) with cp1=(x1, y1), cp2=(x2, y2) to (x_top, y_top)
# top: to (x_tr, y_tr)
# c3: with cp3=(x3, y3), cp4=(x4, y4) to (349, 488)

# Let's extract the actual contour points along the left edge and top edge and right edge!
contours, _ = cv2.findContours(gt_sub.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
c_p = max(contours, key=cv2.contourArea)
pts_p = c_p.reshape(-1, 2)

# Top peak:
idx_top = np.argmin(pts_p[:, 1])
top_pt = pts_p[idx_top]
print("Exact top point:", top_pt)

# Top right:
idx_tr = np.argmax(pts_p[:, 0] - pts_p[:, 1])
tr_pt = pts_p[idx_tr]
print("Exact top right point:", tr_pt)

# Leftmost points along Y:
ys_left = np.arange(top_pt[1], 330)
xs_left = []
for y in ys_left:
    row_xs = pts_p[pts_p[:, 1] == y, 0]
    xs_left.append(row_xs.min())
xs_left = np.array(xs_left)

# Rightmost points along Y:
ys_right = np.arange(tr_pt[1], 330)
xs_right = []
for y in ys_right:
    row_xs = pts_p[pts_p[:, 1] == y, 0]
    xs_right.append(row_xs.max())
xs_right = np.array(xs_right)

# Fit cubic polynomial x = f(y) for left edge:
poly_left = np.polyfit(ys_left, xs_left, 3)
# Fit cubic polynomial x = f(y) for right edge:
poly_right = np.polyfit(ys_right, xs_right, 3)

# Sample along fitted curves:
y_samples_l = np.linspace(332, top_pt[1], 50)
x_samples_l = np.polyval(poly_left, y_samples_l)

y_samples_r = np.linspace(tr_pt[1], 332, 50)
x_samples_r = np.polyval(poly_right, y_samples_r)

pts_curve_l = np.column_stack([x_samples_l, y_samples_l])
pts_top = np.array([top_pt, tr_pt])
pts_curve_r = np.column_stack([x_samples_r, y_samples_r])
pts_bottom = np.array([[349, 488], [162, 488], [153, 332]])

full_poly = np.vstack([pts_curve_l, [tr_pt], pts_curve_r, pts_bottom]).astype(np.int32)

mask_fit = np.zeros((h, w), dtype=np.uint8)
cv2.fillPoly(mask_fit, [full_poly], 1)

intersection = np.sum(gt_sub & (mask_fit > 0))
union = np.sum(gt_sub | (mask_fit > 0))
print(f"Polynomial fit IoU: {intersection/union:.4f} ({intersection/union*100:.2f}%)")

# Let's print out 8-10 points to make a pristine SVG smooth bezier path!
print("Left curve points (bottom to top):")
for y in [488, 410, 330, 250, 170, 90, top_pt[1]]:
    if y > 330:
        x = 162 - (488-y)*0.03
    else:
        x = np.polyval(poly_left, y)
    print(f"  {x:.1f}, {y:.1f}")

print(f"Top right: {tr_pt[0]}, {tr_pt[1]}")

print("Right curve points (top to bottom):")
for y in [tr_pt[1], 180, 240, 300, 360, 420, 488]:
    if y > 330:
        x = 345 + (y-330)*0.03
    else:
        x = np.polyval(poly_right, y)
    print(f"  {x:.1f}, {y:.1f}")
