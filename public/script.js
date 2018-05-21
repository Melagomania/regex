function DropArea() {
  this.dropArea = document.getElementById('drop-area');
  this.previewContainer = document.getElementById('previews');
  this.loadedFilesContainer = document.getElementById('loaded-files-container');
  this.progressBar = document.getElementById('progress');
  
  this.fullSizedImageContainer = document.getElementById('full-sized-img-container');
  this.startStopButton = document.getElementById('button');

  this.cssFiles = [];
  this.imgFiles = [];
  this.uploadingFile = null;
  this.uploadStatus = 'none';
}

DropArea.prototype.init = function () {
  this.preventDefaults();
  this.setDragHandlers();
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
      if(_this.uploadStatus !== 'uploading') {
        _this.highlight();
      }
    });
  });

  unhighlightEvents.forEach(function (eventName) {
    _this.dropArea.addEventListener(eventName, function () {
      if(_this.uploadStatus !== 'uploading') {
        _this.unhighlight();
      }
    });
  });

  _this.dropArea.addEventListener('drop', function (e) {
    if(_this.uploadStatus !== 'uploading') {
      _this.handleDrop(e.dataTransfer);
      }    
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
      _this.uploadFile(_this.uploadingFile, _this.startAfterPause);      
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
  this.progressBar.value = 0;
  this.removeElementsChild(this.previewContainer);
  this.removeElementsChild(this.loadedFilesContainer);  
  this.handleFiles(files);
};

DropArea.prototype.removeElementsChild = function(element) {
  while (element.childElementCount) {
    element.removeChild(element.firstChild);
  }
};

DropArea.prototype.handleFiles = function (files) {
  this.sortFiles(files);
  if(this.imgFiles.length) {
    this.uploadStatus = 'ready-to-start';
    for (const i of this.imgFiles) {
      this.showFilePreview(i);
    }
  } else if(this.cssFiles.length) {
    this.handleCssFile(this.cssFiles[0]);
  }
};

DropArea.prototype.sortFiles = function(files) {
  var imgFiles = [];
  
  for(var i of files) {
    if(i.type.includes('image')) {
      this.imgFiles.push(i);
    } else if(i.type === 'text/css') {
      this.cssFiles.push(i);
    }
  }
};

DropArea.prototype.handleCssFile = function (file) {
  var _this = this;
  var reader = new FileReader();
  reader.readAsText(file);
  reader.onloadend = function () {
    var fileText = reader.result;
    var colors = _this.findColors(fileText);
    console.log('colors :', colors);
    var zeroValueStrings = _this.findZeroValueStrings(fileText);
    console.log('zeroValueStrings :', zeroValueStrings);
  };
};

DropArea.prototype.findColors = function(string) {
  var regex = /(#(?:[\da-f]{3}){1,2}|rgb\((?:\d{1,3},\s*){2}\d{1,3}\)|rgba\((?:\d{1,3},\s*){3}\d*\.?\d+\)|hsl\(\d{1,3}(?:,\s*\d{1,3}%){2}\)|hsla\(\d{1,3}(?:,\s*\d{1,3}%){2},\s*\d*\.?\d+\))/gi;
  return string.match(regex);
};

DropArea.prototype.findZeroValueStrings = function (string) {
  var regex = /\w.*\s0(px|pt|em|rem|vh|vw)(.*|$)/gm;
  return string.match(regex);  
};

DropArea.prototype.uploadFile = function (file, startAfterPause) {
  this.uploadingFile = file;
  if(!startAfterPause) {
    var start = 0;
  } else {
    var start = startAfterPause;
  }
  
  var lastChunk = false;  
  var name = file.name;
  var size = file.size;
  var sliceSize = CHUNK_SIZE;
  var end = start + sliceSize;

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
              _this.startAfterPause = start;
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
  reader.readAsDataURL(file);
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
  var link = document.createElement('a');
  link.setAttribute('href', fileUrl);
  link.setAttribute('target', '_blank');  
  var img = document.createElement('img');
  img.classList.add('loaded-files-img');
  img.src = fileUrl;
  link.appendChild(img);
  this.loadedFilesContainer.appendChild(link);
};

DropArea.prototype.getKB = function (bytes) {
  return (bytes / 1024).toFixed(1);
};


var dropArea = new DropArea();
dropArea.init();