let textureImage = null;
let frameData = [];
let animationGroups = {};
let currentFrame = 0;
let currentAnimation = '';
let isPlaying = false;
let animationInterval = null;

function initSplitter() {
	document.getElementById('png-file-input').addEventListener('change', handlePngUpload);
	document.getElementById('xml-file-input').addEventListener('change', handleXmlUpload);
	document.getElementById('fps-input').addEventListener('change', updateFps);
}

function handlePngUpload(event) {
	const file = event.target.files[0];
	if (!file) return;
	
	const fileName = document.getElementById('png-file-name');
	fileName.textContent = `已选择: ${file.name}`;
	
	const reader = new FileReader();
	reader.onload = function(e) {
		textureImage = new Image();
		textureImage.onload = function() {
			showNotification('PNG图片加载成功');
			updateDownloadButton();
			if (frameData.length > 0) {
				renderCurrentFrame();
			}
		};
		textureImage.src = e.target.result;
	};
	reader.readAsDataURL(file);
}

function handleXmlUpload(event) {
	const file = event.target.files[0];
	if (!file) return;

	const fileName = document.getElementById('xml-file-name');
	fileName.textContent = `已选择: ${file.name}`;
	
	const reader = new FileReader();
	reader.onload = function(e) {
		try {
			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(e.target.result, 'text/xml');
			
			if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
				throw new Error('XML格式错误');
			}
			
			frameData = [];
			animationGroups = {};
			const subTextures = xmlDoc.getElementsByTagName('SubTexture');
			
			for (let i = 0; i < subTextures.length; i++) {
				const subTexture = subTextures[i];
				const frameName = subTexture.getAttribute('name');

				frameData.push({
					name: frameName,
					x: parseInt(subTexture.getAttribute('x')) || 0,
					y: parseInt(subTexture.getAttribute('y')) || 0,
					width: parseInt(subTexture.getAttribute('width')) || 0,
					height: parseInt(subTexture.getAttribute('height')) || 0,
					frameX: Math.abs(parseInt(subTexture.getAttribute('frameX')) || 0),
					frameY: Math.abs(parseInt(subTexture.getAttribute('frameY')) || 0),
					frameWidth: parseInt(subTexture.getAttribute('frameWidth')) || 0,
					frameHeight: parseInt(subTexture.getAttribute('frameHeight')) || 0
				});
				
				const animationName = extractAnimationName(frameName);
				if (!animationGroups[animationName]) {
					animationGroups[animationName] = [];
				}
				animationGroups[animationName].push(frameData.length - 1);
			}
			
			Object.keys(animationGroups).forEach(animationName => {
				animationGroups[animationName].sort((a, b) => {
					const nameA = frameData[a].name.toLowerCase();
					const nameB = frameData[b].name.toLowerCase();
					return nameA.localeCompare(nameB, undefined, {numeric: true});
				});
			});
			
			updateAnimationGroups();
			showNotification(`XML动画数据加载成功，共 ${frameData.length} 帧，${Object.keys(animationGroups).length} 个动画组`);
			updateDownloadButton();
			
			if (textureImage) {
				if (Object.keys(animationGroups).length > 0) {
					currentAnimation = Object.keys(animationGroups)[0];
					currentFrame = animationGroups[currentAnimation][0];
					renderCurrentFrame();
				}
			}
		} catch (error) {
			fileName.textContent = 'XML文件解析错误: ' + error.message;
			showNotification('XML文件解析错误');
		}
	};
	reader.readAsText(file);
}

function extractAnimationName(frameName) {
	if (!frameName) return '未知动画';

	const patterns = [
		/^(.*?)(\d+)$/,
		/^(.*?)_(\d+)$/,
		/^(.*?)-(\d+)$/
	];
	
	for (const pattern of patterns) {
		const match = frameName.match(pattern);
		if (match && match[1]) {
			return match[1];
		}
	}

	return frameName;
}

function updateAnimationGroups() {
	const groupsContainer = document.getElementById('animation-groups');
	groupsContainer.innerHTML = '';
	
	const sortedAnimationNames = Object.keys(animationGroups).sort();
	
	sortedAnimationNames.forEach(animationName => {
		const groupDiv = document.createElement('div');
		groupDiv.className = 'animation-group';
		
		const headerDiv = document.createElement('div');
		headerDiv.className = 'animation-header';
		headerDiv.onclick = () => {
			toggleAnimationGroup(headerDiv);
			if (!isPlaying) {
				playAnimationGroup(animationName);
			}
		};
		
		const nameSpan = document.createElement('span');
		nameSpan.className = 'animation-name';
		nameSpan.textContent = `${animationName} (${animationGroups[animationName].length}帧)`;
		
		const toggleSpan = document.createElement('span');
		toggleSpan.className = 'toggle-icon';
		toggleSpan.textContent = '∨';
		
		headerDiv.appendChild(nameSpan);
		headerDiv.appendChild(toggleSpan);
		
		const frameListDiv = document.createElement('div');
		frameListDiv.className = 'frame-list';
		
		const sortedFrames = [...animationGroups[animationName]].sort((a, b) => {
			const nameA = frameData[a].name.toLowerCase();
			const nameB = frameData[b].name.toLowerCase();
			return nameA.localeCompare(nameB, undefined, {numeric: true});
		});
		
		sortedFrames.forEach(frameIndex => {
			const frameItem = document.createElement('div');
			frameItem.className = 'frame-item';
			if (currentAnimation === animationName && currentFrame === frameIndex) {
				frameItem.classList.add('active');
			}
			frameItem.textContent = frameData[frameIndex].name;
			frameItem.onclick = (e) => {
				e.stopPropagation();
				selectFrame(animationName, frameIndex);
			};
			frameListDiv.appendChild(frameItem);
		});
		
		groupDiv.appendChild(headerDiv);
		groupDiv.appendChild(frameListDiv);
		groupsContainer.appendChild(groupDiv);
		
		if (sortedAnimationNames[0] === animationName) {
			headerDiv.classList.add('active');
		}
	});
}

function toggleAnimationGroup(headerElement) {
	const isActive = headerElement.classList.contains('active');
	
	document.querySelectorAll('.animation-header').forEach(header => {
		header.classList.remove('active');
	});
	
	if (!isActive) {
		headerElement.classList.add('active');
	}
}

function playAnimationGroup(animationName) {
	if (isPlaying) {
		stopAnimation();
	}
	currentAnimation = animationName;
	currentFrame = animationGroups[animationName][0];
	playAnimation();
}

function selectFrame(animationName, frameIndex) {
	currentAnimation = animationName;
	currentFrame = frameIndex;
	renderCurrentFrame();
	updateAnimationGroups();
	
	document.querySelectorAll('.animation-header').forEach(header => {
		const nameSpan = header.querySelector('.animation-name');
		if (nameSpan && nameSpan.textContent.includes(animationName)) {
			header.classList.add('active');
		}
	});
}

function renderCurrentFrame() {
	if (!textureImage || frameData.length === 0) return;
	
	const canvas = document.getElementById('animation-canvas');
	const ctx = canvas.getContext('2d');
	
	const frame = frameData[currentFrame];

	const displayWidth = frame.frameWidth > 0 ? frame.frameWidth : frame.width;
	const displayHeight = frame.frameHeight > 0 ? frame.frameHeight : frame.height;
	
	canvas.width = displayWidth;
	canvas.height = displayHeight;

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.fillStyle = 'transparent';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	const sourceX = frame.x;
	const sourceY = frame.y;
	const sourceWidth = frame.width;
	const sourceHeight = frame.height;
	
	const destX = frame.frameX || 0;
	const destY = frame.frameY || 0;
	const destWidth = frame.width;
	const destHeight = frame.height;

	ctx.drawImage(
		textureImage,
		sourceX, sourceY, sourceWidth, sourceHeight,
		destX, destY, destWidth, destHeight
	);
}

function togglePlay() {
	if (isPlaying) {
		stopAnimation();
	} else {
		playAnimation();
	}
}

function playAnimation() {
	if (frameData.length === 0 || !currentAnimation) return;
	
	isPlaying = true;
	document.getElementById('play-btn').textContent = '暂停';
	
	const fps = parseInt(document.getElementById('fps-input').value) || 24;
	const interval = 1000 / fps;
	
	animationInterval = setInterval(() => {
		const currentGroup = animationGroups[currentAnimation];
		const currentIndex = currentGroup.indexOf(currentFrame);
		const nextIndex = (currentIndex + 1) % currentGroup.length;
		currentFrame = currentGroup[nextIndex];
		renderCurrentFrame();
		updateAnimationGroups();
	}, interval);
}

function stopAnimation() {
	isPlaying = false;
	document.getElementById('play-btn').textContent = '播放';
	
	if (animationInterval) {
		clearInterval(animationInterval);
		animationInterval = null;
	}
}

function prevFrame() {
	if (frameData.length === 0 || !currentAnimation) return;
	
	stopAnimation();
	const currentGroup = animationGroups[currentAnimation];
	const currentIndex = currentGroup.indexOf(currentFrame);
	const prevIndex = (currentIndex - 1 + currentGroup.length) % currentGroup.length;
	currentFrame = currentGroup[prevIndex];
	renderCurrentFrame();
	updateAnimationGroups();
}

function nextFrame() {
	if (frameData.length === 0 || !currentAnimation) return;
	
	stopAnimation();
	const currentGroup = animationGroups[currentAnimation];
	const currentIndex = currentGroup.indexOf(currentFrame);
	const nextIndex = (currentIndex + 1) % currentGroup.length;
	currentFrame = currentGroup[nextIndex];
	renderCurrentFrame();
	updateAnimationGroups();
}

function updateFps() {
	if (isPlaying) {
		stopAnimation();
		playAnimation();
	}
}

function updateDownloadButton() {
	const downloadBtn = document.getElementById('download-btn');
	downloadBtn.disabled = !(textureImage && frameData.length > 0);
}

async function downloadFrames() {
	if (!textureImage || frameData.length === 0) return;
	
	showNotification('正在生成ZIP文件，请稍候...');
	
	const zip = new JSZip();
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	
	for (let i = 0; i < frameData.length; i++) {
		const frame = frameData[i];
		const displayWidth = frame.frameWidth > 0 ? frame.frameWidth : frame.width;
		const displayHeight = frame.frameHeight > 0 ? frame.frameHeight : frame.height;
		
		canvas.width = displayWidth;
		canvas.height = displayHeight;
		
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = 'transparent';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		const sourceX = frame.x;
		const sourceY = frame.y;
		const sourceWidth = frame.width;
		const sourceHeight = frame.height;

		const destX = frame.frameX || 0;
		const destY = frame.frameY || 0;
		const destWidth = frame.width;
		const destHeight = frame.height;

		ctx.drawImage(
			textureImage,
			sourceX, sourceY, sourceWidth, sourceHeight,
			destX, destY, destWidth, destHeight
		);
		
		const blob = await new Promise(resolve => {
			canvas.toBlob(resolve, 'image/png');
		});
		
		const fileName = `${frame.name || `frame_${i}`}.png`;
		zip.file(fileName, blob);
	}
	
	const content = await zip.generateAsync({type: 'blob'});
	saveAs(content, 'split_frames.zip');
	showNotification(`ZIP文件下载完成！共 ${frameData.length} 帧`);
}