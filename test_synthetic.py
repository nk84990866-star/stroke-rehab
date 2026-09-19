import sys, os
proj_dir = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, proj_dir)

from vision_tracker import GesturePoseTracker

tracker = GesturePoseTracker(mode='synthetic')
# No need to init_camera for synthetic mode
frame, data = tracker.get_frame_and_landmarks()
print('Synthetic data:', data)
print('Theta1:', data['theta1'], 'Theta2:', data['theta2'])
