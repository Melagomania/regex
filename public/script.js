function DropArea() {
  this.dropArea = document.getElementById('drop-area');
  this.previewContainer = document.getElementById('previews');
  this.loadedFilesContainer = document.getElementById('loaded-files-container');
  this.progressBar = document.getElementById('progress');
  
  this.fullSizedImageContainer = document.getElementById('full-sized-img-container');
  this.startStopButton = document.getElementById('button');

  this.uploadingFile = null;
  this.uploadStatus = 'none';
}

DropArea.prototype.init = function () {
  this.preventDefaults();
  this.setDragHandlers();
  this.setfullSizedImgHandler();
  this.setButtonHandler();
};

DropArea.prototype.preventDefaults = function () {
  var _this = this;
  var events = ['dragenter', 'dragover', 'dragleave', 'drop'];
  events.forEach(function (eventName) {
    _this.dropArea.addEventListener(eventName, function (e) {
      e.preventDefault();
      e.stopPropagation();
    });
  });
};

DropArea.prototype.setDragHandlers = function () {
  var _this = this;
  var highlightEvents = ['dragenter', 'dragover'];
  var unhighlightEvents = ['dragleave', 'drop'];

  highlightEvents.forEach(function (eventName) {
    _this.dropArea.addEventListener(eventName, function () {
      _this.highlight();
    });
  });

  unhighlightEvents.forEach(function (eventName) {
    _this.dropArea.addEventListener(eventName, function () {
      _this.unhighlight();
    });
  });

  _this.dropArea.addEventListener('drop', function (e) {
    _this.handleDrop(e.dataTransfer);
  });
};

//TODO: rewrite using switch
DropArea.prototype.setButtonHandler = function() {
  var _this = this;
  this.startStopButton.addEventListener('click', function (e) { 
    if(_this.uploadStatus === 'ready-to-start') {
      _this.uploadFile(_this.imgFiles.pop());
      _this.uploadStatus = 'uploading';
    } else if(_this.uploadStatus === 'uploading') {
      _this.uploadStatus = 'paused';     
    } else if(_this.uploadStatus === 'paused') {
      _this.uploadStatus = 'uploading';     
      _this.uploadFile(_this.uploadingFile);      
    }
  });
};

DropArea.prototype.setfullSizedImgHandler = function() {
  var _this = this;
  document.getElementsByTagName('body')[0].addEventListener('click', function(e) {
    if(e.target.classList.contains('loaded-files-img')) {
      var src = e.target.getAttribute('src');
      _this.showFullSizedIMG(src);
    } else if(e.target.classList.contains('full-sized-img-container')) {
      _this.hideFullSizedImg();
    }
  });
};

DropArea.prototype.highlight = function () {
  this.dropArea.classList.add('drop-area-highlighted');
};

DropArea.prototype.unhighlight = function () {
  this.dropArea.classList.remove('drop-area-highlighted');
};

DropArea.prototype.handleDrop = function (dt) {
  var files = dt.files;
  this.handleFiles(files);
};

DropArea.prototype.handleFiles = function (files) {
  this.imgFiles = this.getIMGFiles(files);
  for (let i of this.imgFiles) {
    this.showFilePreview(i);
  }
  this.uploadStatus = 'ready-to-start';
};

DropArea.prototype.getIMGFiles = function(files) {
  var imgFiles = [];
  for(var i of files) {
    if(i.type.includes('image')) {
      imgFiles.push(i);
    }
  }
  return imgFiles;
};

DropArea.prototype.uploadFile = function (file) {
  this.uploadingFile = file;
  var name = file.name;
  var size = file.size;
  var sliceSize = CHUNK_SIZE;
  var start = 0;
  var end = start + sliceSize;
  var lastChunk = false;
  var myStart = 0;

  var chunk = file.slice(start, end);

  this.progressBar.setAttribute('max', size);
  send.call(this, name, start, lastChunk, chunk);


  //FIXME: fix context problem
  function send(name, start, lastChunk, chunk) {
    var _this = this;

    var formdata = new FormData();
    var xhr = new XMLHttpRequest();

    xhr.open('POST', ENDPOINT_URL, true);
    
    formdata.append('name', name);
    formdata.append('start', start);
    formdata.append('lastChunk', lastChunk);
    formdata.append('chunk', chunk);

    xhr.addEventListener('readystatechange', function() {
      if(this.status === 200) {
        if (xhr.readyState === 4) {
          if(JSON.parse(xhr.responseText).expectedStart) {
            start = JSON.parse(xhr.responseText).expectedStart;
            end = start + sliceSize;
            if (size - end <= 0) {
              end = size;
              lastChunk = true;
            }
            chunk = file.slice(start, end);
            _this.updateProgressBar(start);
            if(_this.uploadStatus === 'uploading') {
              send.call(_this, name, start, lastChunk, chunk);
            } else if(_this.uploadStatus === 'paused') {
              _this.uploadingOptions = {
                name: name,
                chunk: chunk,
                start: start,
                lastChunk: lastChunk
              }
              console.log('_this.uploadingOptions :', _this.uploadingOptions);
            }
          } else if(JSON.parse(xhr.responseText).fileUrl) {
            _this.renderLoadedFilePreview(JSON.parse(xhr.responseText).fileUrl);
            if(_this.imgFiles.length) {
              _this.updateProgressBar(end);
                _this.uploadFile(_this.imgFiles.pop());
            } else {
              _this.uploadStatus = 'none';  
              console.log('All pics loaded');
            }
          }
        }
      }
    });
    xhr.send(formdata);
  }

  function slice(file, start, end) {
    var slice = file.mozSlice ? file.mozSlice :
      file.webkitSlice ? file.webkitSlice :
      file.slice ? file.slice : undefined;

    return slice.bind(file)(start, end);
  }
}

DropArea.prototype.updateProgressBar = function(percentage) {
  this.progressBar.value = percentage;
};

DropArea.prototype.showFilePreview = function (file) {
  var _this = this;
  var reader = new FileReader();
  reader.readAsDataURL(file)
  reader.onloadend = function () {
    var fileInfo = {
      imageData: reader.result,
      fileName: file.name,
      fileSize: file.size
    }
    _this.renderFilePreview(fileInfo);
  };
};

DropArea.prototype.renderFilePreview = function (fileInfo) {
  var fragment = document.createDocumentFragment();

  var previewItem = document.createElement('li');
  previewItem.classList.add('preview-item');

  var previewImg = document.createElement('img');
  previewImg.classList.add('preview-item-img');
  previewImg.src = fileInfo.imageData;

  var previewInfo = document.createElement('div');
  previewInfo.classList.add('preview-info');

  var previewName = document.createElement('span');
  previewName.style.display = 'block';
  previewName.textContent = 'File name: ' + fileInfo.fileName;

  var previewSize = document.createElement('span');
  previewSize.style.display = 'block';
  previewSize.textContent = 'File size: ' + this.getKB(fileInfo.fileSize) + 'kb';

  previewInfo.appendChild(previewName);
  previewInfo.appendChild(previewSize);

  previewItem.appendChild(previewImg);
  previewItem.appendChild(previewInfo);

  fragment.appendChild(previewItem);
  this.previewContainer.appendChild(fragment);
};

DropArea.prototype.renderLoadedFilePreview = function(fileUrl) {
  var img = document.createElement('img');
  img.classList.add('loaded-files-img');
  img.src = fileUrl;
  this.loadedFilesContainer.appendChild(img);
};


//TODO: implement showing pics by changing their src attribute
DropArea.prototype.showFullSizedIMG = function(imgUrl) {
  if(this.fullSizedImageContainer.childNodes.length) {
    this.fullSizedImageContainer.removeChild(this.fullSizedImageContainer.firstChild);
  }
  var img = document.createElement('img');
  img.setAttribute('src', imgUrl);
  img.classList.add('full-sized-img');
  console.log(img.src);
  
  this.fullSizedImageContainer.appendChild(img);
  this.fullSizedImageContainer.style.display = 'flex';
};

DropArea.prototype.hideFullSizedImg = function(params) {
  this.fullSizedImageContainer.style.display = 'none';
};

DropArea.prototype.getKB = function (bytes) {
  return (bytes / 1024).toFixed(1);
;}



var dropArea = new DropArea();
dropArea.init();