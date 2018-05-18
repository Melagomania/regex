# Task: Upload files to the server with drag and drop.

### Requirements
1. Create interface elements: "Dropzone", "Results block", progress bar and "Start/Pause" button according to ```wireframe.png```.
 
2. Provide visual feedback on Dropzone element when image files are dragged over dropzone (overlay with text), dragged outside or dropped.
 
3. When files(including images) from desktop are dropped on Dropzone:

    a. Remove all previews from Dropzone and Results block that are left from previous upload (if any).

    b. Filter out all non image files

    c. Create small previews for each image dragged from desktop and insert them into Dropzone block with filename and size(in kB) info.

    d. Send all image files(one by one) in chunks via POST request to endpoint stored in global variable ```ENDPOINT_URL```

    e. Update progress bar after success response each chunk.

    f. Stop sending chunks when "Start/Pause" button is clicked while upload. Start upload from next chunk when it is licked while upload is paused.

    g. Prevent drop and feedback for another dragged files until upload isn't finished. Also prevent navigating from page when files are released above Dropzone element in this case.

    h. Use links from server response to append scaled down images to Results block.

    i. Click on images previews in Results block should show them in full size in new tab.

4. When files (without images) from desktop are dropped on Dropzone:

    a. Remove all previews from Dropzone and Results block that are left from previous upload (if any).

    b. Filter out all non CSS files (files that has `.css` extension)

    c. Parse **first** CSS file as text retrieve next results:

    * List of all uniqe colors (including case insensitive hexidecimal (#RGB, #RRGGBB), functional (rgb, rgba, hls, hlsa).

    * List of all strings (whole string) that has 0 value which is followed by unit from the list: px, pt, em, rem, vh, vw

    d. Render results in output block as `h2` for heading (Unique colors, Unneded units ) and `pre` block with each item on its own line.




### Communication with the server
Use global variable ```ENDPOINT_URL``` to setup ```url``` parameter for ```XMLHttpRequest```

Send files one by one.

Files should be sent in chunks (Size of chunk is defined as global variable ```CHUNK_SIZE```).

Sent next chunk one by one (only after successful callback from previous request).
You can use ```expectedStart``` parameter from the response to get start position of next chunk in file.

**Request should contain next fields:**
 - ```name``` - ```String```. original file name
 - ```start``` - ```Integer```. Position of chunk in original file
 - ```lastChunk``` - ```Boolean``` - indicates if this is last chunk to the file. ```true``` - for last chunk in file and ```false``` otherwise.
 - ```chunk``` - ```Blob``` object that represents chunk of the file

**Server will return next responses:**
For all chunks but last it will return expected ```start``` value for next chunk

```json
{
    "expectedStart":1024
}
```

for last chunk it returns image url (use it for 4th requirement)

```json
{
    "fileUrl":"uploads/test.jpeg"
}
```

### Server setup: 

1. Download and install Node.js from http://nodejs.org/
2. Open folder with ```package.json``` in console
3. Run ```npm install```
4. Run ```npm start```
5. Open http://localhost:3001/ in browser