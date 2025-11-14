let currentEngine = 'codename';
let useSpaces = true;
let currentTool = 'home';

function init() {
	document.getElementById('spaces-checkbox').addEventListener('change', function() {
		useSpaces = this.checked;
	});
}

function selectTool(tool) {
	if (tool === 'converter' || tool === 'splitter' || tool === 'developing' || tool === 'chart-converter') {
		currentTool = tool;
		document.getElementById('homepage').style.display = 'none';
		document.getElementById('converter-container').style.display = 'none';
		document.getElementById('splitter-container').style.display = 'none';
		document.getElementById('developing-container').style.display = 'none';
		document.getElementById('chart-converter-container').style.display = 'none';
		
		if (tool === 'converter') {
			document.getElementById('converter-container').style.display = 'block';
		} else if (tool === 'splitter') {
			document.getElementById('splitter-container').style.display = 'block';
			initSplitter();
		} else if (tool === 'developing') {
			document.getElementById('developing-container').style.display = 'block';
		} else if (tool === 'chart-converter') {
			document.getElementById('chart-converter-container').style.display = 'block';
			initChartConverter();
		}
	}
}

function goHome() {
	currentTool = 'home';
	document.getElementById('homepage').style.display = 'block';
	document.getElementById('converter-container').style.display = 'none';
	document.getElementById('splitter-container').style.display = 'none';
	document.getElementById('developing-container').style.display = 'none';
	document.getElementById('chart-converter-container').style.display = 'none';
}

function selectEngine(engine) {
	currentEngine = engine;

	document.querySelectorAll('.engine-card').forEach(card => {
		card.classList.remove('active');
	});
	event.currentTarget.classList.add('active');

	document.querySelectorAll('.converter-container').forEach(container => {
		container.classList.remove('active');
	});
	document.getElementById(engine + '-converter').classList.add('active');
}

function openSettingsTab(tab) {
	document.querySelectorAll('.settings-tab').forEach(t => {
		t.classList.remove('active');
	});
	document.querySelectorAll('.settings-content').forEach(c => {
		c.classList.remove('active');
	});
	
	event.currentTarget.classList.add('active');
	document.getElementById(tab + '-settings').classList.add('active');
}

function openSettings() {
	document.getElementById('settings-modal').classList.add('active');
}

function closeSettings() {
	document.getElementById('settings-modal').classList.remove('active');
}

function selectOutput(outputId) {
	const outputElement = document.getElementById(outputId);
	const range = document.createRange();
	range.selectNodeContents(outputElement);
	const selection = window.getSelection();
	selection.removeAllRanges();
	selection.addRange(range);
}

window.onload = function() {
	init();
};