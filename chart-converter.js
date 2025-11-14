let cneChartData = null;
let cneMetaData = null;
let psychChartData = null;

function initChartConverter() {
	document.getElementById('cne-chart-file-main').addEventListener('change', handleCneChartUploadMain);
	document.getElementById('cne-meta-file-main').addEventListener('change', handleCneMetaUploadMain);
}

function handleCneChartUploadMain(event) {
	const file = event.target.files[0];
	if (!file) return;
	
	const fileName = document.getElementById('cne-chart-file-name-main');
	fileName.textContent = `已选择: ${file.name}`;
	
	const reader = new FileReader();
	reader.onload = function(e) {
		try {
			cneChartData = JSON.parse(e.target.result);
			showNotification('CNE谱子文件加载成功');
			updateChartDownloadButtonMain();
		} catch (error) {
			fileName.textContent = 'JSON文件解析错误: ' + error.message;
			showNotification('CNE谱子文件解析错误');
		}
	};
	reader.readAsText(file);
}

function handleCneMetaUploadMain(event) {
	const file = event.target.files[0];
	if (!file) return;
	
	const fileName = document.getElementById('cne-meta-file-name-main');
	fileName.textContent = `已选择: ${file.name}`;
	
	const reader = new FileReader();
	reader.onload = function(e) {
		try {
			cneMetaData = JSON.parse(e.target.result);
			showNotification('Meta文件加载成功');
			updateChartDownloadButtonMain();
		} catch (error) {
			fileName.textContent = 'JSON文件解析错误: ' + error.message;
			showNotification('Meta文件解析错误');
		}
	};
	reader.readAsText(file);
}

function convertChartToPsychMain() {
	if (!cneChartData || !cneMetaData) {
		showNotification('请先上传CNE谱子文件和Meta文件');
		return;
	}

	try {
		psychChartData = convertCneToPsychChart(cneChartData, cneMetaData);
		const output = document.getElementById('chart-converter-output');
		output.textContent = JSON.stringify(psychChartData, null, useSpaces ? '\t' : null);
		showNotification('谱子转换成功');
		document.getElementById('download-chart-btn-main').disabled = false;
	} catch (error) {
		showNotification('谱子转换错误: ' + error.message);
	}
}

function convertCneToPsychChart(cneChart, meta) {
	const psychJson = {
		song: {
			song: meta.displayName || "unknown",
			notes: [],
			events: [],
			bpm: meta.bpm || 150,
			needsVoices: meta.needsVoices !== false,
			speed: cneChart.scrollSpeed || 1,
			player1: "bf",
			player2: "dad",
			gfVersion: "gf",
			stage: cneChart.stage || "stage",
			validScore: true
		}
	};

	let currentBPM = meta.bpm || 150;
	let currentMustHitSection = false;
	let sectionTimes = [0];

	function createSection() {
		return {
			lengthInSteps: 16,
			altAnim: false,
			sectionNotes: [],
			bpm: currentBPM,
			sectionBeats: 4,
			changeBPM: false,
			mustHitSection: currentMustHitSection,
			typeOfSection: 0,
			gfSection: false
		};
	}

	function calculateSectionTimes() {
		sectionTimes = [0];
		let currentTime = 0;
		const crochet = (60 / currentBPM) * 1000;
		
		let maxTime = 0;
		if (cneChart.strumLines) {
			cneChart.strumLines.forEach(strumLine => {
				if (strumLine.notes) {
					strumLine.notes.forEach(note => {
						maxTime = Math.max(maxTime, note.time);
					});
				}
			});
		}
		
		while (currentTime < maxTime + 1000) {
			currentTime += 4 * crochet;
			sectionTimes.push(currentTime);
		}
	}

	calculateSectionTimes();

	for (let i = 0; i < sectionTimes.length - 1; i++) {
		psychJson.song.notes.push(createSection());
	}

	function findSectionIndex(time) {
		for (let i = 0; i < sectionTimes.length - 1; i++) {
			if (time >= sectionTimes[i] && time < sectionTimes[i + 1]) {
				return i;
			}
		}
		return -1;
	}

	if (cneChart.events) {
		cneChart.events.sort((a, b) => a.time - b.time);
		
		cneChart.events.forEach(event => {
			if (event.name === "BPM Change") {
				currentBPM = event.params[0];
				calculateSectionTimes();
				
				const psychEvent = ["BPM Change", currentBPM.toString()];
				const existingEvent = psychJson.song.events.find(e => Math.abs(e[0] - event.time) < 1);
				if (existingEvent) {
					existingEvent[1].push(psychEvent);
				} else {
					psychJson.song.events.push([event.time, [psychEvent]]);
				}
			}
			else if (event.name === "Camera Movement") {
				const cameraParam = event.params[0];
				if (cameraParam === 0) {
					currentMustHitSection = false;
				} else if (cameraParam === 1) {
					currentMustHitSection = true;
				} else {
					currentMustHitSection = true;
				}
				
				const sectionIndex = findSectionIndex(event.time);
				if (sectionIndex >= 0 && sectionIndex < psychJson.song.notes.length) {
					psychJson.song.notes[sectionIndex].mustHitSection = currentMustHitSection;
					for (let i = sectionIndex + 1; i < psychJson.song.notes.length; i++) {
						psychJson.song.notes[i].mustHitSection = currentMustHitSection;
					}
				}
			}
			else if (event.name === "Change Character") {
				if (event.params && event.params.length >= 2) {
					const characterIndex = event.params[0].toString();
					const characterName = event.params[1].toString();
					
					let characterRole = "";
					if (characterIndex === "0") characterRole = "dad";
					else if (characterIndex === "1") characterRole = "boyfriend";
					else if (characterIndex === "2") characterRole = "gf";
					else characterRole = characterIndex;
					
					const psychEvent = ["Change Character", characterRole, characterName];
					const existingEvent = psychJson.song.events.find(e => Math.abs(e[0] - event.time) < 1);
					if (existingEvent) {
						existingEvent[1].push(psychEvent);
					} else {
						psychJson.song.events.push([event.time, [psychEvent]]);
					}
				}
			}
			else if (event.name === "Play Animation") {
				if (event.params && event.params.length >= 2) {
					const animName = event.params[0].toString();
					const characterIndex = event.params[1].toString();
					
					let characterRole = "";
					if (characterIndex === "0") characterRole = "dad";
					else if (characterIndex === "1") characterRole = "boyfriend";
					else if (characterIndex === "2") characterRole = "gf";
					else characterRole = characterIndex;
					
					const psychEvent = ["Play Animation", animName, characterRole];
					const existingEvent = psychJson.song.events.find(e => Math.abs(e[0] - event.time) < 1);
					if (existingEvent) {
						existingEvent[1].push(psychEvent);
					} else {
						psychJson.song.events.push([event.time, [psychEvent]]);
					}
				}
			}
			else {
				if (event.params && event.params.length > 0) {
					const eventParams = event.params.map(p => {
						if (typeof p === 'boolean') return p.toString();
						if (typeof p === 'number') return p.toString();
						return p;
					});
					
					const psychEvent = [event.name, ...eventParams];
					
					const existingEvent = psychJson.song.events.find(e => Math.abs(e[0] - event.time) < 1);
					if (existingEvent) {
						existingEvent[1].push(psychEvent);
					} else {
						psychJson.song.events.push([event.time, [psychEvent]]);
					}
				}
			}
		});
	}

	if (cneChart.strumLines) {
		cneChart.strumLines.forEach((strumLine, lineIndex) => {
			if (strumLine.notes) {
				strumLine.notes.sort((a, b) => a.time - b.time);
				
				strumLine.notes.forEach(note => {
					const sectionIndex = findSectionIndex(note.time);
					
					if (sectionIndex >= 0 && sectionIndex < psychJson.song.notes.length) {
						const section = psychJson.song.notes[sectionIndex];
						
						let noteData = [note.time, note.id, note.sLen || 0];
						
						if (section.mustHitSection) {
							if (strumLine.type === 1) {
							} else if (strumLine.type === 0) {
								noteData[1] += 4;
							}
						} else {
							if (strumLine.type === 0) {
							} else if (strumLine.type === 1) {
								noteData[1] += 4;
							}
						}
						
						let noteType = "";
						if (note.type > 0 && cneChart.noteTypes && cneChart.noteTypes[note.type]) {
							noteType = cneChart.noteTypes[note.type];
						}
						noteData.push(noteType);
						
						section.sectionNotes.push(noteData);
					}
				});
			}
		});
	}

	if (cneChart.strumLines) {
		const player2 = cneChart.strumLines.find(line => line.type === 0);
		const player1 = cneChart.strumLines.find(line => line.type === 1);
		const gf = cneChart.strumLines.find(line => line.type === 2);
		
		if (player2 && player2.characters && player2.characters[0]) {
			psychJson.song.player2 = player2.characters[0];
		}
		if (player1 && player1.characters && player1.characters[0]) {
			psychJson.song.player1 = player1.characters[0];
		}
		if (gf && gf.characters && gf.characters[0]) {
			psychJson.song.gfVersion = gf.characters[0];
		}
	}

	psychJson.song.bpm = currentBPM;

	return psychJson;
}

function downloadPsychChartMain() {
	if (!psychChartData) {
		showNotification('没有可下载的谱子数据');
		return;
	}

	const blob = new Blob([JSON.stringify(psychChartData, null, useSpaces ? '\t' : null)], {type: 'application/json'});
	saveAs(blob, `${psychChartData.song.song}.json`);
	showNotification('PE谱子下载完成');
}

function updateChartDownloadButtonMain() {
	const downloadBtn = document.getElementById('download-chart-btn-main');
	downloadBtn.disabled = !psychChartData;
}