function DropArea() {
  this.dropArea = document.getElementById('drop-area');
  this.previewContainer = document.getElementById('previews');
  this.loadedFilesContainer = document.getElementById('loaded-files-container');
  this.progressBar = document.getElementById('progress');
}

DropArea.prototype.init = function () {
  this.preventDefaults();
  this.setDragHandlers();
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
  var _this = this;
  this.imgFiles = this.getIMGFiles(files);
  for (let i of this.imgFiles) {
    _this.showFilePreview(i);
  }
  _this.uploadFile(this.imgFiles.pop());
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
  var name = file.name;
  var size = file.size;
  var sliceSize = CHUNK_SIZE;
  var start = 0;
  var lastChunk = false;
  
  var _this = this;
  setTimeout(loop, 1);
  function loop() {
    var end = start + sliceSize;  
    if (size - end <= 0) {
      end = size;
      lastChunk = true;
    }
    var chunk = slice(file, start, end);
    send.call(_this, name, start, lastChunk, chunk); 
    if (end < size) {
      setTimeout(loop, 1);
    }
  }

  //fix context problem
  function send(name, chunkStart, lastChunk, chunk) {
    var _this = this;
    var formdata = new FormData();
    var xhr = new XMLHttpRequest();

    xhr.open('POST', ENDPOINT_URL, false);
    
    formdata.append('name', name);
    formdata.append('start', chunkStart);
    formdata.append('lastChunk', lastChunk);
    formdata.append('chunk', chunk);
    xhr.addEventListener('readystatechange', function() {
      if(this.status === 200) {
        start =  JSON.parse(xhr.responseText).expectedStart;
        
        
        if(JSON.parse(xhr.responseText).fileUrl) {
          _this.renderLoadedFilePreview(JSON.parse(xhr.responseText).fileUrl);
          if(_this.imgFiles.length) {
            _this.updateProgressBar(100);
            _this.uploadFile(_this.imgFiles.pop());
          } else {
            console.log('All pics uploaded')
          }
        } else {
          var percentage = _this.getPercentage(start, size);
          _this.updateProgressBar(percentage);
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

DropArea.prototype.getPercentage = function(value, full) {
  return value / full * 100;
} 


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
} 

DropArea.prototype.getKB = function (bytes) {
  return (bytes / 1024).toFixed(1);
}



var dropArea = new DropArea();
dropArea.init();