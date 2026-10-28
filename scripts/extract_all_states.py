import cv2
import numpy as np

def analyze_crop(name, path):
    img = cv2.imread(path)
    print(f"\n==================== {name} ====================")
    # 1. Purple
    mask_p = (img[:,:,0] > 180) & (img[:,:,2] > 70) & (img[:,:,2] < 120) & (img[:,:,1] < 50)
    cnts_p, _ = cv2.findContours(mask_p.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if cnts_p:
        c_p = max(cnts_p, key=cv2.contourArea)
        pts = c_p.reshape(-1, 2)
        print(f"Purple X=[{pts[:,0].min()}, {pts[:,0].max()}], Y=[{pts[:,1].min()}, {pts[:,1].max()}]")
        approx = cv2.approxPolyDP(c_p, 0.006 * cv2.arcLength(c_p, True), True)
        print("Purple vertices:")
        for pt in approx:
            print(f"  {pt[0][0]}, {pt[0][1]}")

    # 2. Black
    mask_b = (img[:,:,0] < 45) & (img[:,:,1] < 45) & (img[:,:,2] < 45)
    mask_b[:180, :] = False
    mask_b[:, :290] = False
    mask_b[:, 460:] = False
    cnts_b, _ = cv2.findContours(mask_b.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if cnts_b:
        c_b = max(cnts_b, key=cv2.contourArea)
        pts = c_b.reshape(-1, 2)
        print(f"Black X=[{pts[:,0].min()}, {pts[:,0].max()}], Y=[{pts[:,1].min()}, {pts[:,1].max()}]")
        approx = cv2.approxPolyDP(c_b, 0.006 * cv2.arcLength(c_b, True), True)
        print("Black vertices:")
        for pt in approx:
            print(f"  {pt[0][0]}, {pt[0][1]}")

    # 3. Yellow
    mask_y = (img[:,:,0] < 50) & (img[:,:,1] > 170) & (img[:,:,2] > 200)
    cnts_y, _ = cv2.findContours(mask_y.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if cnts_y:
        c_y = max(cnts_y, key=cv2.contourArea)
        pts = c_y.reshape(-1, 2)
        print(f"Yellow X=[{pts[:,0].min()}, {pts[:,0].max()}], Y=[{pts[:,1].min()}, {pts[:,1].max()}]")

    # 4. Orange face features (black contours inside orange area)
    mask_ob = (img[:,:,0] < 45) & (img[:,:,1] < 45) & (img[:,:,2] < 45)
    mask_ob[:340, :] = False
    mask_ob[470:, :] = False
    mask_ob[:, :100] = False
    mask_ob[:, 360:] = False
    cnts_ob, _ = cv2.findContours(mask_ob.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    print(f"Orange features: {len(cnts_ob)}")
    for c in cnts_ob:
        m = cv2.moments(c)
        if m['m00'] > 0:
            print(f"  feat: ({m['m10']/m['m00']:.1f}, {m['m01']/m['m00']:.1f}), w={cv2.boundingRect(c)[2]}, h={cv2.boundingRect(c)[3]}")

for name, path in [
    ('neutral', 'design/crop_neutral.png'),
    ('email_typing', 'design/crop_email_typing.png'),
    ('password_dots', 'design/crop_password_dots.png'),
    ('error', 'design/crop_error.png'),
    ('reveal', 'design/crop_reveal.png')
]:
    analyze_crop(name, path)
