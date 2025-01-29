import cv2
from ultralytics import YOLO

# Load the YOLOv8 model (you can use a pre-trained model or your own)
model = YOLO('D:\\python\\tommm.pt')  # Replace with your model path if needed

# Open the webcam (0 is the default camera, you can change this if you have multiple cameras)
cap = cv2.VideoCapture(0)

# Check if the camera opened correctly
if not cap.isOpened():
    print("Error: Could not open camera.")
    exit()

while True:
    # Read a frame from the camera
    ret, frame = cap.read()
    
    if not ret:
        print("Error: Failed to capture frame.")
        break

    # Perform object detection on the captured frame
    results = model(frame)  # Pass the frame to the YOLO model

    # Process the detection results
    for result in results:
        # Get the bounding boxes, class labels, and confidence scores
        boxes = result.boxes.xyxy  # Bounding box coordinates (x1, y1, x2, y2)
        classes = result.names  # Class labels
        confidences = result.boxes.conf  # Confidence scores
        
        # Draw bounding boxes on the frame
        for box, conf, cls in zip(boxes, confidences, classes):
            x1, y1, x2, y2 = map(int, box)  # Convert to integer values for pixel coordinates
            label = classes[cls]  # Get the class label
            confidence = conf.item()  # Get the confidence score
            
            # Draw rectangle (bounding box)
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, f'{label} {confidence:.2f}', (x1, y1 - 10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    # Display the frame with bounding boxes
    cv2.imshow("YOLO Object Detection", frame)

    # Exit the loop when 'q' key is pressed
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Release the camera and close all OpenCV windows
cap.release()
cv2.destroyAllWindows()
