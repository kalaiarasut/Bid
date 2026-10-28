import cv2
import numpy as np

img = cv2.imread('design/crop_password_sneaky.png')
mask_p = (img[:,:,0] > 180) & (img[:,:,2] > 70) & (img[:,:,2] < 120) & (img[:,:,1] < 50)
contours, _ = cv2.findContours(mask_p.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
c_p = max(contours, key=cv2.contourArea)

# Find key corner points:
# P1: top peak (minimum Y) -> (309, 22)
# P2: slanted top-right corner (maximum X around Y < 180) -> (426, 147)
# P3: where right edge meets black / orange -> around (349, 488) or behind orange
# P4: bottom left base -> (162, 488)
# P5: where left edge emerges from behind orange -> around (153, 332)

pts = c_p.reshape(-1, 2)
# Find max X with Y in [120, 160]
candidates_tr = pts[(pts[:, 1] >= 140) & (pts[:, 1] <= 155)]
p_top_right = candidates_tr[np.argmax(candidates_tr[:, 0])]
p_top_peak = pts[np.argmin(pts[:, 1])]
print("Top peak:", p_top_peak)
print("Top right corner:", p_top_right)

# Let's extract points from (162, 488) to top_peak along the left edge
# and from top_right to (349, 488) along right edge
# Let's write an SVG path using cubic bezier segments and check IoU with cv2.fillPoly
# Segment 1: from (162, 488) straight up to (153, 332)
# Segment 2: from (153, 332) C (160, 230) (215, 105) (309, 22)
# Segment 3: L (426, 147)
# Segment 4: C (385, 205) (352, 280) (349, 488)
# Segment 5: Z

for cp1_x in range(150, 175, 5):
    for cp1_y in range(210, 245, 10):
        for cp2_x in range(205, 230, 5):
            for cp2_y in range(90, 120, 10):
                # evaluate
                pass

print("Testing bezier SVG path...")
d_path = f"M 162,488 L 153,332 C 160,225 215,100 {p_top_peak[0]},{p_top_peak[1]} L {p_top_right[0]},{p_top_right[1]} C 385,205 352,280 349,488 Z"
print("SVG path:", d_path)
