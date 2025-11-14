function updatePsychOutput() {
	const type = document.getElementById('psych-conversion-type').value;
	const input = document.getElementById('psych-input');
	const jsonSection = document.getElementById('json-output-section');

	if (type === 'xml-to-json') {
		input.placeholder = '在此处粘贴人物 XML 数据';
		jsonSection.classList.remove('active');
	} else {
		input.placeholder = '在此处粘贴舞台 XML 数据';
		jsonSection.classList.add('active');
	}

	document.getElementById('psych-output').textContent = '';
	document.getElementById('psych-json-output').textContent = '';
}

function convertCodename() {
	const input = document.getElementById('codename-input').value.trim();
	const output = document.getElementById('codename-output');

	if (!input) {
		output.textContent = '请输入JSON数据';
		return;
	}

	try {
		convertJSONtoXML(input, output);
	} catch (error) {
		output.textContent = '转换错误: ' + error.message;
	}
}

function clearCodename() {
	document.getElementById('codename-input').value = '';
	document.getElementById('codename-output').textContent = '';
}

function convertPsych() {
	const input = document.getElementById('psych-input').value.trim();
	const output = document.getElementById('psych-output');
	const jsonOutput = document.getElementById('psych-json-output');
	const type = document.getElementById('psych-conversion-type').value;

	if (!input) {
		output.textContent = '请输入数据';
		jsonOutput.textContent = '请输入数据';
		return;
	}

	try {
		if (type === 'xml-to-json') {
			convertXMLtoJSON(input, output);
			jsonOutput.textContent = '';
		} else {
			convertXMLtoLua(input, output);
			convertXMLtoStageJSON(input, jsonOutput);
		}
	} catch (error) {
		const errorMsg = '转换错误: ' + error.message;
		output.textContent = errorMsg;
		jsonOutput.textContent = errorMsg;
	}
}

function clearPsych() {
	document.getElementById('psych-input').value = '';
	document.getElementById('psych-output').textContent = '';
	document.getElementById('psych-json-output').textContent = '';
}

function convertXMLtoJSON(xmlInput, output) {
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(xmlInput, 'text/xml');

	if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
		output.textContent = 'XML格式错误';
		return;
	}

	const character = xmlDoc.getElementsByTagName('character')[0];
	if (!character) {
		output.textContent = '未找到character标签';
		return;
	}

	const y = parseInt(character.getAttribute('y')) || 0;
	const x = parseInt(character.getAttribute('x')) || 0;
	const sprite = character.getAttribute('sprite') || '';
	const flipX = character.getAttribute('flipX') === 'true';
	const isPlayer = character.getAttribute('isPlayer') === 'true';
	const icon = character.getAttribute('icon') || '';
	const color = character.getAttribute('color') || '#FFFFFF';
	const holdTime = parseInt(character.getAttribute('holdTime')) || 4;
	const camx = parseInt(character.getAttribute('camx')) || 0;
	const camy = parseInt(character.getAttribute('camy')) || 0;

	const hexColor = color.replace('#', '');
	const r = parseInt(hexColor.substr(0, 2), 16);
	const g = parseInt(hexColor.substr(2, 2), 16);
	const b = parseInt(hexColor.substr(4, 2), 16);

	const animElements = character.getElementsByTagName('anim');
	const animations = [];

	for (let i = 0; i < animElements.length; i++) {
		const anim = animElements[i];
		const indicesAttr = anim.getAttribute('indices');
		const indices = indicesAttr ? indicesAttr.split(',').map(idx => parseInt(idx.trim())) : [];

		animations.push({
			name: anim.getAttribute('anim') || '',
			anim: anim.getAttribute('name') || '',
			fps: parseInt(anim.getAttribute('fps')) || 24,
			loop: anim.getAttribute('loop') !== 'false',
			indices: indices,
			offsets: [
				parseInt(anim.getAttribute('x')) || 0,
				parseInt(anim.getAttribute('y')) || 0
			]
		});
	}

	const jsonResult = {
		animations: animations,
		vocals_file: "",
		no_antialiasing: false,
		image: `characters/${sprite}`,
		position: [x, y],
		healthicon: icon,
		flip_x: flipX,
		healthbar_colors: [r, g, b],
		camera_position: [camx, camy],
		sing_duration: holdTime,
		scale: 1,
		_editor_isPlayer: isPlayer
	};

	output.textContent = JSON.stringify(jsonResult, null, useSpaces ? '\t' : null);
}

function convertJSONtoXML(jsonInput, output) {
	const jsonData = JSON.parse(jsonInput);

	let xml = '<!DOCTYPE codename-engine-character>\n';
	xml += '<character';

	xml += ` y="${jsonData.position[1] || 0}"`;
	xml += ` x="${jsonData.position[0] || 0}"`;
	xml += ` sprite="${jsonData.image.replace('characters/', '')}"`;
	xml += ` flipX="${jsonData.flip_x}"`;
	xml += ` isPlayer="${jsonData._editor_isPlayer}"`;
	xml += ` icon="${jsonData.healthicon}"`;

	const colors = jsonData.healthbar_colors || [255, 255, 255];
	const hexColor = '#' + 
		(colors[0] || 255).toString(16).padStart(2, '0') +
		(colors[1] || 255).toString(16).padStart(2, '0') +
		(colors[2] || 255).toString(16).padStart(2, '0');
	xml += ` color="${hexColor.toUpperCase()}"`;

	xml += ` camx="${jsonData.camera_position[0] || 0}"`;
	xml += ` camy="${jsonData.camera_position[1] || 0}"`;
	xml += ` holdTime="${jsonData.sing_duration || 4}"`;
	xml += '>\n';

	jsonData.animations.forEach(anim => {
		xml += `\t<anim name="${anim.anim || ''}" anim="${anim.name || ''}" x="${anim.offsets[0] || 0}" y="${anim.offsets[1] || 0}" fps="${anim.fps || 24}" loop="${anim.loop}"`;

		if (anim.indices && anim.indices.length > 0) {
			xml += ` indices="${anim.indices.join(',')}"`;
		}

		xml += '/>\n';
	});

	xml += '</character>';

	output.textContent = xml;
}

function convertXMLtoLua(xmlInput, output) {
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(xmlInput, 'text/xml');

	if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
		output.textContent = 'XML格式错误';
		return;
	}

	const stage = xmlDoc.getElementsByTagName('stage')[0];
	if (!stage) {
		output.textContent = '未找到stage标签';
		return;
	}

	const folder = stage.getAttribute('folder') || '';
	const zoom = stage.getAttribute('zoom') || '0.9';

	let luaCode = 'function onCreate()\n\n';

	const sprites = stage.getElementsByTagName('sprite');
	const girlfriend = stage.getElementsByTagName('girlfriend')[0];
	const dad = stage.getElementsByTagName('dad')[0];
	const boyfriend = stage.getElementsByTagName('boyfriend')[0];

	const characterElements = [];
	if (girlfriend) characterElements.push({type: 'girlfriend', element: girlfriend});
	if (dad) characterElements.push({type: 'dad', element: dad});
	if (boyfriend) characterElements.push({type: 'boyfriend', element: boyfriend});

	for (let i = 0; i < sprites.length; i++) {
		const sprite = sprites[i];
		const spriteName = sprite.getAttribute('name') || `sprite${i}`;
		const spriteFile = sprite.getAttribute('sprite') || '';
		const x = sprite.getAttribute('x') || '0';
		const y = sprite.getAttribute('y') || '0';
		const scale = sprite.getAttribute('scale') || '1';
		const scaleX = sprite.getAttribute('scalex') || scale;
		const scaleY = sprite.getAttribute('scaley') || scale;
		const spriteType = sprite.getAttribute('type') || 'normal';
		const scrollX = sprite.getAttribute('scrollx') || '1';
		const scrollY = sprite.getAttribute('scrolly') || '1';

		const anims = sprite.getElementsByTagName('anim');
		const hasAnimations = anims.length > 0;

		let isBehindCharacters = false;
		for (const char of characterElements) {
			const charElement = char.element;
			if (charElement && charElement.nextSibling) {
				let nextSibling = charElement.nextSibling;
				while (nextSibling) {
					if (nextSibling.nodeType === 1 && nextSibling.tagName === 'sprite' && 
						nextSibling.getAttribute('name') === spriteName) {
						isBehindCharacters = true;
						break;
					}
					nextSibling = nextSibling.nextSibling;
				}
				if (isBehindCharacters) break;
			}
		}

		if (hasAnimations) {
			luaCode += `makeAnimatedLuaSprite('${spriteName}', '${folder}${spriteFile}', ${x}, ${y})\n`;
			
			for (let j = 0; j < anims.length; j++) {
				const anim = anims[j];
				const animName = anim.getAttribute('name') || 'idle';
				const animAnim = anim.getAttribute('anim') || animName;
				const animLoop = anim.getAttribute('loop') === 'true' ? 'true' : 'false';
				const animFps = anim.getAttribute('fps') || '24';

				luaCode += `addAnimationByPrefix('${spriteName}', '${animName}', '${animAnim}', ${animFps}, ${animLoop})\n`;
			}
			
			luaCode += `playAnim('${spriteName}', 'idle', true)\n`;
		} else {
			if (spriteType === 'none') {
				luaCode += `makeLuaSprite('${spriteName}', '', ${x}, ${y})\n`;
				luaCode += `makeGraphic('${spriteName}', 100, 100, 'FFFFFF')\n`;
			} else {
				luaCode += `makeLuaSprite('${spriteName}', '${folder}${spriteFile}', ${x}, ${y})\n`;
			}
		}

		if (scaleX !== '1' || scaleY !== '1') {
			luaCode += `scaleObject('${spriteName}', ${scaleX}, ${scaleY})\n`;
		}

		if (scrollX !== '1' || scrollY !== '1') {
			luaCode += `setScrollFactor('${spriteName}', ${scrollX}, ${scrollY})\n`;
		}

		luaCode += `addLuaSprite('${spriteName}', ${isBehindCharacters})\n\n`;
	}

	if (boyfriend) {
		const bfScale = boyfriend.getAttribute('scale');
		if (bfScale && bfScale !== '1') {
			luaCode += `setProperty('boyfriend.scale.x', ${bfScale})\n`;
			luaCode += `setProperty('boyfriend.scale.y', ${bfScale})\n`;
		}
		
		const bfScroll = boyfriend.getAttribute('scroll');
		if (bfScroll && bfScroll !== '1') {
			luaCode += `setScrollFactor('boyfriend', ${bfScroll}, ${bfScroll})\n`;
		}
		luaCode += '\n';
	}

	if (dad) {
		const dadScale = dad.getAttribute('scale');
		if (dadScale && dadScale !== '1') {
			luaCode += `setProperty('dad.scale.x', ${dadScale})\n`;
			luaCode += `setProperty('dad.scale.y', ${dadScale})\n`;
		}
		
		const dadScroll = dad.getAttribute('scroll');
		if (dadScroll && dadScroll !== '1') {
			luaCode += `setScrollFactor('dad', ${dadScroll}, ${dadScroll})\n`;
		}
		luaCode += '\n';
	}

	if (girlfriend) {
		const gfScale = girlfriend.getAttribute('scale');
		if (gfScale && gfScale !== '1') {
			luaCode += `setProperty('gf.scale.x', ${gfScale})\n`;
			luaCode += `setProperty('gf.scale.y', ${gfScale})\n`;
		}
		
		const gfScroll = girlfriend.getAttribute('scroll');
		if (gfScroll && gfScroll !== '1') {
			luaCode += `setScrollFactor('gf', ${gfScroll}, ${gfScroll})\n`;
		}
		luaCode += '\n';
	}

	luaCode += 'end';

	output.textContent = luaCode;
}

function convertXMLtoStageJSON(xmlInput, output) {
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(xmlInput, 'text/xml');

	if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
		output.textContent = 'XML格式错误';
		return;
	}

	const stage = xmlDoc.getElementsByTagName('stage')[0];
	if (!stage) {
		output.textContent = '未找到stage标签';
		return;
	}

	const folder = stage.getAttribute('folder') || '';
	const zoom = stage.getAttribute('zoom') || '0.75';

	let boyfriendPos = [770, 100];
	let girlfriendPos = [200, 130];
	let opponentPos = [-350, 250];

	let cameraBoyfriend = [0, 0];
	let cameraGirlfriend = [0, 0];
	let cameraOpponent = [0, 0];

	const boyfriend = stage.getElementsByTagName('boyfriend')[0];
	if (boyfriend) {
		const bfX = parseInt(boyfriend.getAttribute('x')) || 770;
		const bfY = parseInt(boyfriend.getAttribute('y')) || 100;
		boyfriendPos = [bfX, bfY];

		const bfCamX = parseInt(boyfriend.getAttribute('camxoffset')) || 0;
		const bfCamY = parseInt(boyfriend.getAttribute('camyoffset')) || 0;
		cameraBoyfriend = [bfCamX, bfCamY];
	}
	const dad = stage.getElementsByTagName('dad')[0];
	if (dad) {
		const dadX = parseInt(dad.getAttribute('x')) || -350;
		const dadY = parseInt(dad.getAttribute('y')) || 250;
		opponentPos = [dadX, dadY];
		const dadCamX = parseInt(dad.getAttribute('camxoffset')) || 0;
		const dadCamY = parseInt(dad.getAttribute('camyoffset')) || 0;
		cameraOpponent = [dadCamX, dadCamY];
	}
	const girlfriend = stage.getElementsByTagName('girlfriend')[0];
	if (girlfriend) {
		const gfX = parseInt(girlfriend.getAttribute('x')) || 200;
		const gfY = parseInt(girlfriend.getAttribute('y')) || 130;
		girlfriendPos = [gfX, gfY];
		const gfCamX = parseInt(girlfriend.getAttribute('camxoffset')) || 0;
		const gfCamY = parseInt(girlfriend.getAttribute('camyoffset')) || 0;
		cameraGirlfriend = [gfCamX, gfCamY];
	}
	const stageJSON = {
		"directory": folder,
		"defaultZoom": parseFloat(zoom),
		"isPixelStage": false,
		"boyfriend": boyfriendPos,
		"girlfriend": girlfriendPos,
		"opponent": opponentPos,
		"hide_girlfriend": false,
		"camera_boyfriend": cameraBoyfriend,
		"camera_opponent": cameraOpponent,
		"camera_girlfriend": cameraGirlfriend,
		"camera_speed": 1
	};
	output.textContent = JSON.stringify(stageJSON, null, useSpaces ? '\t' : null);
}