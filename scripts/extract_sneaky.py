import cv2
import numpy as np

img = cv2.imread('design/crop_password_sneaky.png')

# 1. Purple
mask_p = (img[:,:,0] > 180) & (img[:,:,2] > 70) & (img[:,:,2] < 120) & (img[:,:,1] < 50)
contours_p, _ = cv2.findContours(mask_p.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
c_p = max(contours_p, key=cv2.contourArea)
pts_p = c_p.reshape(-1, 2)
print("Purple bounding:", pts_p[:,0].min(), pts_p[:,0].max(), pts_p[:,1].min(), pts_p[:,1].max())

# Approximate polygon of purple
epsilon = 0.003 * cv2.arcLength(c_p, True)
approx_p = cv2.approxPolyDP(c_p, epsilon, True)
print(f"Purple polygon vertices ({len(approx_p)}):")
for pt in approx_p:
    print(f"  {pt[0][0]}, {pt[0][1]}")

# 2. Black
# In crop_password_sneaky.png, black is between y=180 and 490, x=300 and 450
mask_b = (img[:,:,0] < 45) & (img[:,:,1] < 45) & (img[:,:,2] < 45)
# isolate the black character
mask_b[:180, :] = False
mask_b[:, :320] = False
mask_b[:, 460:] = False
contours_b, _ = cv2.findContours(mask_b.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
if len(contours_b) > 0:
    c_b = max(contours_b, key=cv2.contourArea)
    approx_b = cv2.approxPolyDP(c_b, 0.004 * cv2.arcLength(c_b, True), True)
    print(f"Black polygon vertices ({len(approx_b)}):")
    for pt in approx_b:
        print(f"  {pt[0][0]}, {pt[0][1]}")

# 3. Yellow
mask_y = (img[:,:,0] < 50) & (img[:,:,1] > 170) & (img[:,:,2] > 200)
contours_y, _ = cv2.findContours(mask_y.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
if len(contours_y) > 0:
    c_y = max(contours_y, key=cv2.contourArea)
    approx_y = cv2.approxPolyDP(c_y, 0.003 * cv2.arcLength(c_y, True), True)
    print(f"Yellow polygon vertices ({len(approx_y)}):")
    for pt in approx_y:
        print(f"  {pt[0][0]}, {pt[0][1]}")

# 4. Orange
mask_o = (img[:,:,2] > 200) & (img[:,:,0] < 90) & (img[:,:,1] > 90) & (img[:,:,1] < 160)
contours_o, _ = cv2.findContours(mask_o.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
if len(contours_o) > 0:
    c_o = max(contours_o, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(c_o)
    print(f"Orange bounding box: x={x}, y={y}, w={w}, h={h}")

# 5. Eyes and Mouth of all characters in Sneaky state
# Let's inspect white elements (eyes of purple and black)
mask_white = (img[:,:,0] > 240) & (img[:,:,1] > 240) & (img[:,:,2] > 240)
contours_w, _ = cv2.findContours(mask_white.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
print(f"White eye contours: {len(contours_w)}")
for cw in contours_w:
    m = cv2.moments(cw)
    if m['m00'] > 0:
        cx = m['m10'] / m['m00']
        cy = m['m01'] / m['m00']
        r = np.sqrt(m['m00'] / np.pi)
        print(f"  White eye: cx={cx:.1f}, cy={cy:.1f}, r={r:.1f}")

# Pupils inside white eyes:
for cw in contours_w:
    x, y, w, h = cv2.boundingRect(cw)
    eye_crop = img[y:y+h, x:x+w]
    pupil_mask = (eye_crop[:,:,0] < 50) & (eye_crop[:,:,1] < 50) & (eye_crop[:,:,2] < 50)
    m = cv2.moments(pupil_mask.astype(np.uint8))
    if m['m00'] > 0:
        px = x + m['m10'] / m['m00']
        py = y + m['m01'] / m['m00']
        print(f"  Pupil: cx={px:.1f}, cy={py:.1f}")

# Orange face dots
# Inside orange (y in [350, 450], x in [220, 350])
crop_o = img[350:450, 220:350]
mask_ob = (crop_o[:,:,0] < 45) & (crop_o[:,:,1] < 45) & (crop_o[:,:,2] < 45)
contours_ob, _ = cv2.findContours(mask_ob.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
print(f"Orange face features ({len(contours_ob)}):")
for cob in contours_ob:
    m = cv2.moments(cob)
    if m['m00'] > 0:
        cx = 220 + m['m10'] / m['m00']
        cy = 350 + m['m01'] / m['m00']
        r = np.sqrt(m['m00'] / np.pi)
        print(f"  Orange feature: cx={cx:.1f}, cy={cy:.1f}, r={r:.1f}")

# Purple mouth slot
crop_pm = img[100:200, 320:380]
mask_pm = (crop_pm[:,:,0] < 45) & (crop_pm[:,:,1] < 45) & (crop_pm[:,:,2] < 45)
contours_pm, _ = cv2.findContours(mask_pm.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
print(f"Purple mouth candidates ({len(contours_pm)}):")
for cpm in contours_pm:
    m = cv2.moments(cpm)
    if m['m00'] > 0:
        cx = 320 + m['m10'] / m['m00']
        cy = 100 + m['m01'] / m['m00']
        x, y, w, h = cv2.boundingRect(cpm)
        print(f"  Purple mouth: cx={cx:.1f}, cy={cy:.1f}, w={w}, h={h}")
