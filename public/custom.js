document.addEventListener('DOMContentLoaded', function() {

    // Clear local storage when the page is loaded
    localStorage.clear();

    let recognition; // Recognition object for voice commands
    let answerRecognition; // Recognition object for answer transcription
    let mode = 'Idle'; // Mode of the editor
    let isRecordingAnswer = false; // Track if we're recording an answer
    let currentAnswerIndex = -1; // Track which question we're answering
    let justStoppedRecording = false; // Flag to prevent immediate command processing
    let intentionallyStoppedMain = false; // Flag to track intentional main recognition stops

    let editMode = false;
    let editBox = -1;
    let replaceMode = false;
    let currentIndex = 0;

    // Function to read text aloud using text-to-speech
    function speakText(text) {
        const speechSynthesis = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.speak(utterance);
    }

    function startRecording(index) {
        if (isRecordingAnswer) {
            console.log('Already recording an answer');
            return;
        }

        // Pause the main recognition before starting answer recording
        if (recognition) {
            console.log('Pausing main recognition for answer recording');
            intentionallyStoppedMain = true;
            recognition.stop();
        }

        isRecordingAnswer = true;
        currentAnswerIndex = index;
        mode = 'Recording Answer for Question ' + (index + 1);
        document.getElementById(`status-ind`).innerHTML = "Status: " + mode;

        // Create new recognition instance for answer transcription
        answerRecognition = new window.webkitSpeechRecognition();
        answerRecognition.continuous = true;
        answerRecognition.interimResults = true;

        answerRecognition.onresult = function(event) {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // Check for "stop over finish" command first
            if (finalTranscript.toLowerCase().includes('stop over finish')) {
                console.log('Stop command detected in answer recording for question', index + 1);
                stopAnswerRecording();
                const fullTranscription = document.getElementById(`ans-${index}`).textContent.trim();
                if (fullTranscription) {
                    speakText(fullTranscription);
                }
                return;
            }

            // Update the answer div with final results only
            const answerDiv = document.getElementById(`ans-${index}`);
            if (finalTranscript) {
                answerDiv.textContent += finalTranscript + ' ';
            }
        };

        answerRecognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            isRecordingAnswer = false;
            currentAnswerIndex = -1;
            mode = 'Idle';
            document.getElementById(`status-ind`).innerHTML = "Status: " + mode;
        };

        answerRecognition.onend = function() {
            if (isRecordingAnswer) {
                // Restart if we're still supposed to be recording
                answerRecognition.start();
            }
        };

        answerRecognition.start();
        console.log('Started recording answer for question', index + 1);
    }

    function stopRecognition() {
        recognition.stop();
    }

    function stopAnswerRecording() {
        if (answerRecognition && isRecordingAnswer) {
            const questionNumber = currentAnswerIndex + 1; // Store before resetting
            answerRecognition.stop();
            isRecordingAnswer = false;
            currentAnswerIndex = -1;
            mode = 'Idle';
            document.getElementById(`status-ind`).innerHTML = "Status: " + mode;
            console.log('Stopped recording answer for question', questionNumber);
            
            // Set flag to prevent immediate command processing
            justStoppedRecording = true;
            setTimeout(() => {
                justStoppedRecording = false;
            }, 1000); // Wait 1 second before allowing new commands
            
            // Restart the main recognition after a short delay
            setTimeout(() => {
                console.log('Restarting main recognition after answer recording');
                if (recognition) {
                    intentionallyStoppedMain = false;
                    recognition.start();
                }
            }, 500); // Wait 500ms before restarting main recognition
        }
    }

    function listenForSpeech() {
        recognition = new window.webkitSpeechRecognition();
        recognition.continuous = true;

        recognition.onresult = function(event) {
            const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
            console.log('Voice command detected:', transcript); // Debug log

            // Don't process commands if we're recording an answer or just stopped recording
            if (isRecordingAnswer || justStoppedRecording) {
                console.log('Ignoring command while recording answer or just stopped');
                return;
            }

            if (transcript.includes('select question')) {
                var questionNumber = transcript.split('select question ')[1];
                console.log('Raw question number:', questionNumber);
                
                // Handle different number formats
                if (questionNumber.includes('one') || questionNumber.includes('1')) {
                    questionNumber = 1;
                } else if (questionNumber.includes('two') || questionNumber.includes('2')) {
                    questionNumber = 2;
                } else if (questionNumber.includes('three') || questionNumber.includes('3')) {
                    questionNumber = 3;
                } else if (questionNumber.includes('four') || questionNumber.includes('4')) {
                    questionNumber = 4;
                } else if (questionNumber.includes('five') || questionNumber.includes('5')) {
                    questionNumber = 5;
                }
                
                const index = parseInt(questionNumber, 10) - 1;
                console.log('Parsed index:', index);
                
                if (index >= 0 && index < questions.length) {
                    const ansBox = document.getElementById(`question-${index}`);
                    mode = 'Answering Question ' + (index + 1);
                    document.getElementById(`status-ind`).innerHTML = "Status: " +  mode;

                    ansBox.scrollIntoView();
                    
                    // Only start recording if not already recording
                    if (!isRecordingAnswer) {
                        startRecording(index);
                    } else {
                        console.log('Already recording, stopping current recording first');
                        stopAnswerRecording();
                        // Wait a moment then start new recording
                        setTimeout(() => {
                            startRecording(index);
                        }, 500);
                    }
                } else {
                    console.log('Invalid question index:', index, 'Questions length:', questions.length);
                }
            }

            // Note: "stop over finish" is handled in the answer recording function
            if (transcript.includes("edit question")) {
                console.log('Executing: edit question command');
                currentIndex = 0;
                var questionNumber = transcript.split('edit question ')[1];
                console.log('Raw edit question number:', questionNumber);
                
                // Handle different number formats
                if (questionNumber.includes('one') || questionNumber.includes('1')) {
                    questionNumber = 1;
                } else if (questionNumber.includes('two') || questionNumber.includes('2')) {
                    questionNumber = 2;
                } else if (questionNumber.includes('three') || questionNumber.includes('3')) {
                    questionNumber = 3;
                } else if (questionNumber.includes('four') || questionNumber.includes('4')) {
                    questionNumber = 4;
                } else if (questionNumber.includes('five') || questionNumber.includes('5')) {
                    questionNumber = 5;
                }
                
                const index = parseInt(questionNumber, 10) - 1;
                console.log('Edit question index:', index);
            
                const contentDiv = document.getElementById(`ans-${index}`);
                mode = 'Editing Question ' + (index + 1);
                document.getElementById(`status-ind`).innerHTML = "Status: " + mode;
            
                                 if (contentDiv) {
                     console.log('Content div found, entering edit mode');
                     // Set focus on the contenteditable div
                     contentDiv.focus();
             
                     // Collapse the selection to the start of the contenteditable div
                     const selection = window.getSelection();
                     const range = document.createRange();
                     range.selectNodeContents(contentDiv);
                     range.collapse(true);
                     selection.removeAllRanges();
                     selection.addRange(range);
             
                     // Set the edit mode and edit box index
                     editMode = true;
                     editBox = index;
                     console.log('Edit mode activated for question:', index + 1);
                     
                     // Add visual indicator for edit mode
                     contentDiv.style.border = '2px solid #007bff';
                     contentDiv.style.backgroundColor = '#f8f9fa';
                     
                 } else {
                     console.error(`Contenteditable div with id 'ans-${index}' not found`);
                 }
            }
            

            if (editMode) {
                console.log('Edit mode active, processing commands for editBox:', editBox);
                
                if (transcript.includes("delete all")) {
                    console.log('Executing: delete all');
                    const textarea = document.getElementById(`ans-${editBox}`);
                    textarea.innerHTML = "";
                    saveChangesAndExitEdit();
                }

                if (transcript.includes("select this sentence")) {
                    console.log('Executing: select this sentence');
                    selectSentence();
                }

                if (transcript.includes("add text")) {
                    console.log('Executing: add text');
                    addText();
                }

                if (transcript.includes("delete sentence")) {
                    console.log('Executing: delete sentence');
                    deleteSentence();
                }
               
                if (transcript.includes("highlight text")) {
                    console.log('Executing: highlight text');
                    highlight();
                }
                if (transcript.includes("save and exit")) {
                    console.log('Executing: save and exit');
                    saveChangesAndExitEdit();
                }
               
                if (transcript.includes("move cursor next")) {
                    console.log('Executing: move cursor next');
                    moveCursorNext();
                }

                if (transcript.includes("move cursor back")) {
                    console.log('Executing: move cursor back');
                    moveCursorBack();
                }
               
                                 if (transcript.includes("stop over finish")) {
                     console.log('Executing: stop over finish');
                     stopRecognition();
                     console.log("Recording stopped.");
                 }
                 
                 if (transcript.includes("exit edit mode") || transcript.includes("exit edit")) {
                     console.log('Executing: exit edit mode');
                     saveChangesAndExitEdit();
                 }
            }
        }

        recognition.onend = function() {
            console.log('Main recognition ended');
            // Only restart if we're not recording an answer, not just stopped recording, and not intentionally stopped
            if (!isRecordingAnswer && !justStoppedRecording && !intentionallyStoppedMain) {
                console.log('Restarting main recognition');
                setTimeout(() => {
                    recognition.start();
                }, 100); // Small delay to prevent conflicts
            }
        }

        recognition.start();
    }



    function selectSentence() {
        const div = document.getElementById(`ans-${editBox}`);
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const cursorPosition = range.startOffset;
        const text = div.textContent;
        
        // Find the start of the current sentence
        let sentenceStart = 0;
        for (let i = cursorPosition - 1; i >= 0; i--) {
            if (text[i] === '.' || text[i] === '!' || text[i] === '?') {
                sentenceStart = i + 1;
                break;
            }
        }
        
        // Find the end of the current sentence
        let sentenceEnd = text.length;
        for (let i = cursorPosition; i < text.length; i++) {
            if (text[i] === '.' || text[i] === '!' || text[i] === '?') {
                sentenceEnd = i + 1;
                break;
            }
        }
        
        // Create a new range for the sentence
        const sentenceRange = document.createRange();
        
        // Find the text node and position within it
        let currentPos = 0;
        let startNode = null;
        let startOffset = 0;
        let endNode = null;
        let endOffset = 0;
        
        function traverseNodes(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const nodeLength = node.textContent.length;
                if (!startNode && currentPos + nodeLength > sentenceStart) {
                    startNode = node;
                    startOffset = sentenceStart - currentPos;
                }
                if (!endNode && currentPos + nodeLength >= sentenceEnd) {
                    endNode = node;
                    endOffset = sentenceEnd - currentPos;
                    return true; // Stop traversal
                }
                currentPos += nodeLength;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                for (let child of node.childNodes) {
                    if (traverseNodes(child)) return true;
                }
            }
            return false;
        }
        
        traverseNodes(div);
        
        if (startNode && endNode) {
            sentenceRange.setStart(startNode, startOffset);
            sentenceRange.setEnd(endNode, endOffset);
            selection.removeAllRanges();
            selection.addRange(sentenceRange);
            div.focus();
            console.log('Selected sentence from position', sentenceStart, 'to', sentenceEnd);
        } else {
            console.log('Could not find text nodes for sentence selection');
        }
    }
    
       function addText() {
        const div = document.getElementById(`ans-${editBox}`);
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);

        // Pause the main recognition before starting text insertion
        if (recognition) {
            console.log('Pausing main recognition for text insertion');
            intentionallyStoppedMain = true;
            recognition.stop();
        }

        // Create new recognition instance for text insertion
        const insertRecognition = new window.webkitSpeechRecognition();
        insertRecognition.continuous = true;
        insertRecognition.interimResults = true;

        insertRecognition.onresult = function(event) {
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                }
            }

            // Check for "stop over finish" command
            if (finalTranscript.toLowerCase().includes('stop over finish')) {
                console.log('Stop command detected in text insertion');
                insertRecognition.stop();
                
                // Restart the main recognition after a short delay
                setTimeout(() => {
                    console.log('Restarting main recognition after text insertion');
                    if (recognition) {
                        intentionallyStoppedMain = false;
                        recognition.start();
                    }
                }, 500);
                return;
            }

            if (finalTranscript) {
                // Insert the recognized text at the cursor position
                const textNode = document.createTextNode(finalTranscript + ' ');
                range.deleteContents();
                range.insertNode(textNode);

                // Move the cursor to the end of the inserted text
                range.setStartAfter(textNode);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                
                // Ensure the div maintains focus
                div.focus();
            }
        };

        insertRecognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
        };

        insertRecognition.onend = function() {
            console.log('Text insertion recognition ended');
        };

        insertRecognition.start();
        console.log('Started text insertion mode');
    }

    
    // Function to set cursor position within a contenteditable div
    function setCaretPosition(element, position) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(element.firstChild, position);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        element.focus();
    }
    
    
    function deleteSentence() {
        const div = document.getElementById(`ans-${editBox}`);
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const cursorPosition = range.startOffset;
        const text = div.textContent;
        
        // Find the start of the current sentence
        let sentenceStart = 0;
        for (let i = cursorPosition - 1; i >= 0; i--) {
            if (text[i] === '.' || text[i] === '!' || text[i] === '?') {
                sentenceStart = i + 1;
                break;
            }
        }
        
        // Find the end of the current sentence
        let sentenceEnd = text.length;
        for (let i = cursorPosition; i < text.length; i++) {
            if (text[i] === '.' || text[i] === '!' || text[i] === '?') {
                sentenceEnd = i + 1;
                break;
            }
        }
        
        // Create a new range for the sentence
        const sentenceRange = document.createRange();
        
        // Find the text node and position within it
        let currentPos = 0;
        let startNode = null;
        let startOffset = 0;
        let endNode = null;
        let endOffset = 0;
        
        function traverseNodes(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const nodeLength = node.textContent.length;
                if (!startNode && currentPos + nodeLength > sentenceStart) {
                    startNode = node;
                    startOffset = sentenceStart - currentPos;
                }
                if (!endNode && currentPos + nodeLength >= sentenceEnd) {
                    endNode = node;
                    endOffset = sentenceEnd - currentPos;
                    return true; // Stop traversal
                }
                currentPos += nodeLength;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                for (let child of node.childNodes) {
                    if (traverseNodes(child)) return true;
                }
            }
            return false;
        }
        
        traverseNodes(div);
        
        if (startNode && endNode) {
            sentenceRange.setStart(startNode, startOffset);
            sentenceRange.setEnd(endNode, endOffset);
            sentenceRange.deleteContents();
            
            // Move cursor to the start of the deleted sentence
            sentenceRange.setStart(startNode, startOffset);
            sentenceRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(sentenceRange);
            div.focus();
            console.log('Deleted sentence from position', sentenceStart, 'to', sentenceEnd);
        } else {
            console.log('Could not find text nodes for sentence deletion');
        }
    }
    function saveChangesAndExitEdit() {
        const div = document.getElementById(`ans-${editBox}`);
        const editedResponse = div.textContent;
        localStorage.setItem(`response-${editBox}`, editedResponse);
        console.log("Changes saved.");
        
        // Remove visual indicators
        div.style.border = '';
        div.style.backgroundColor = '';
        
        editMode = false;
        editBox = -1;
    
        // Update the mode indicator text to "You can record now"
        const modeIndicator = document.getElementById(`mode-indicator-${editBox}`);
        if (modeIndicator) {
            modeIndicator.textContent = "You can record now";
        } else {
            console.error(`Mode indicator with id 'mode-indicator-${editBox}' not found`);
        }
    }
    
    

    function highlight() {
        const div = document.getElementById(`ans-${editBox}`);
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        if (selectedText.length > 0) {
            const newNode = document.createElement('strong');
            newNode.textContent = selectedText;
            range.deleteContents();
            range.insertNode(newNode);
            console.log('Highlighted text:', selectedText);
        } else {
            console.log('No text selected for highlighting');
        }
    }
    function moveCursorNext() {
        const div = document.getElementById(`ans-${editBox}`);
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const cursorPosition = range.startOffset;
        const text = div.textContent;
        
        // Find the next sentence boundary
        let nextSentenceStart = text.length;
        for (let i = cursorPosition; i < text.length; i++) {
            if (text[i] === '.' || text[i] === '!' || text[i] === '?') {
                // Find the start of the next sentence (skip whitespace)
                for (let j = i + 1; j < text.length; j++) {
                    if (text[j] !== ' ' && text[j] !== '\n' && text[j] !== '\t') {
                        nextSentenceStart = j;
                        break;
                    }
                }
                break;
            }
        }
        
        if (nextSentenceStart < text.length) {
            // Find the text node and position within it
            let currentPos = 0;
            let targetNode = null;
            let targetOffset = 0;
            
            function findTextNode(node) {
                if (node.nodeType === Node.TEXT_NODE) {
                    const nodeLength = node.textContent.length;
                    if (currentPos + nodeLength > nextSentenceStart) {
                        targetNode = node;
                        targetOffset = nextSentenceStart - currentPos;
                        return true;
                    }
                    currentPos += nodeLength;
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    for (let child of node.childNodes) {
                        if (findTextNode(child)) return true;
                    }
                }
                return false;
            }
            
            findTextNode(div);
            
            if (targetNode) {
                range.setStart(targetNode, targetOffset);
                range.setEnd(targetNode, targetOffset);
                selection.removeAllRanges();
                selection.addRange(range);
                div.focus();
                console.log('Moved cursor to next sentence at position', nextSentenceStart);
            } else {
                console.log('Could not find text node for cursor movement');
            }
        } else {
            console.log("No next sentence found.");
        }
    }
    
    function moveCursorBack() {
        const div = document.getElementById(`ans-${editBox}`);
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const cursorPosition = range.startOffset;
        const text = div.textContent;
        
        // Find the previous sentence boundary
        let prevSentenceStart = 0;
        for (let i = cursorPosition - 1; i >= 0; i--) {
            if (text[i] === '.' || text[i] === '!' || text[i] === '?') {
                // Find the start of the previous sentence (skip whitespace)
                for (let j = i + 1; j < cursorPosition; j++) {
                    if (text[j] !== ' ' && text[j] !== '\n' && text[j] !== '\t') {
                        prevSentenceStart = j;
                        break;
                    }
                }
                break;
            }
        }
        
        if (prevSentenceStart > 0 || cursorPosition > 0) {
            // Find the text node and position within it
            let currentPos = 0;
            let targetNode = null;
            let targetOffset = 0;
            
            function findTextNode(node) {
                if (node.nodeType === Node.TEXT_NODE) {
                    const nodeLength = node.textContent.length;
                    if (currentPos + nodeLength > prevSentenceStart) {
                        targetNode = node;
                        targetOffset = prevSentenceStart - currentPos;
                        return true;
                    }
                    currentPos += nodeLength;
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    for (let child of node.childNodes) {
                        if (findTextNode(child)) return true;
                    }
                }
                return false;
            }
            
            findTextNode(div);
            
            if (targetNode) {
                range.setStart(targetNode, targetOffset);
                range.setEnd(targetNode, targetOffset);
                selection.removeAllRanges();
                selection.addRange(range);
                div.focus();
                console.log('Moved cursor to previous sentence at position', prevSentenceStart);
            } else {
                console.log('Could not find text node for cursor movement');
            }
        } else {
            console.log("No previous sentence found.");
        }
    }

    const questionsDiv = document.getElementById('questions');
    if (!questionsDiv) {
        console.error('Questions div not found');
        return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    let questions;
    
    try {
        questions = JSON.parse(decodeURIComponent(urlParams.get('file')));
        console.log('Parsed questions:', questions);
    } catch (error) {
        console.error('Error parsing questions:', error);
        // Fallback questions for testing
        questions = [
            "Who are you?",
            "Where do you live?",
            "Tell me about your project?",
            "How was your day?"
        ];
    }

    if (!questions || questions.length === 0) {
        console.log('No questions found, using fallback');
        questions = [
            "Who are you?",
            "Where do you live?",
            "Tell me about your project?",
            "How was your day?"
        ];
    }

    questions.forEach((question, index) => {
        const questionElement = document.createElement('div');
        questionElement.classList.add('question');

        const questionHeading = document.createElement('h2');
        questionHeading.classList.add('question-heading');
        questionHeading.id = `question-${index}`;
        questionHeading.textContent = 'Question ' + (index + 1);
        questionElement.appendChild(questionHeading);

        const questionPara = document.createElement('p');
        questionPara.classList.add('question-text');
        questionPara.textContent = question.trim();
        questionElement.appendChild(questionPara);

        // Create a new container for buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.classList.add('button-container');
        questionElement.appendChild(buttonContainer);

        const speakButton = document.createElement('button');
        speakButton.classList.add('speak-button');
        speakButton.innerHTML = '<i class="fas fa-volume-up"></i> Speak';
        buttonContainer.appendChild(speakButton);

        const readButton = document.createElement('button');
        readButton.classList.add('read-button');
        readButton.textContent = 'Read Text';
        buttonContainer.appendChild(readButton);

        // Add event listeners for both buttons
        speakButton.addEventListener('click', function() {
            const questionText = questionPara.textContent;
            speakText(questionText);
        });

        readButton.addEventListener('click', function() {
            const textToRead = document.getElementById(`ans-${index}`).textContent.trim();
            speakText(textToRead);
        });

        const recordingText = document.createElement('div');
        recordingText.id = `ans-${index}`;
        recordingText.contentEditable = true; // Make the div editable
        recordingText.classList.add('recording-text');
        recordingText.placeholder = 'Recording notes...';
        // Retrieve the previous response from localStorage, if available
        const previousResponse = localStorage.getItem(`response-${index}`);
        console.log(previousResponse);

        if (previousResponse) {
            recordingText.innerHTML = previousResponse; // Use innerHTML to set the content
        }
        questionElement.appendChild(recordingText);

        questionsDiv.appendChild(questionElement);

    });
    function downloadPDF() {
        const doc = new jsPDF();
        const questionsDiv = document.getElementById('questions');
        const questions = Array.from(questionsDiv.getElementsByClassName('question'));
    
        let yPos = 10; // Initialize y position for text
    
        questions.forEach((question, index) => {
            const questionHeading = question.querySelector('.question-heading').textContent;
            const questionText = question.querySelector('.question-text').textContent;
            const answerText = question.querySelector('.recording-text').textContent;
            var username = document.cookie.split('=')[1];
    
            doc.setFontSize(12);
            if (index === 0) { 
                const university = 'Amrita Vishwa Vidyapeetham';
                const department = 'Department of Computer Science Semester Exam';
                const pageWidth = doc.internal.pageSize.width;
    
                const universityTextWidth = doc.getStringUnitWidth(university) * doc.internal.getFontSize() / doc.internal.scaleFactor;
                const departmentTextWidth = doc.getStringUnitWidth(department) * doc.internal.getFontSize() / doc.internal.scaleFactor;
    
                const universityTextPosition = (pageWidth - universityTextWidth) / 2;
                const departmentTextPosition = (pageWidth - departmentTextWidth) / 2;
    
                doc.text(university, universityTextPosition, yPos);
                yPos += 10;
                doc.text(department, departmentTextPosition, yPos);
                yPos += 10;
                doc.text(username, 10, yPos);
                yPos += 10;
            }
    
            const content = `Question ${index + 1}\n${questionText}\n\nAnswer:\n${answerText}\n\n`;
            doc.text(content, 10, yPos);
    
            yPos += 80; 
    
            if (yPos >= doc.internal.pageSize.height) {
                doc.addPage(); // Add a new page
                yPos = 10; // Reset y position for the new page
            }
        });
    
        doc.save('questions_and_answers.pdf');
    }


    const submitButton = document.createElement('button');
    submitButton.classList.add('submit-button');
    submitButton.textContent = 'Submit';
    document.body.appendChild(submitButton);
    
    submitButton.addEventListener('click', downloadPDF);


    listenForSpeech();
});

// auto edit 04:29:26
// auto edit 04:29:26
// auto edit 04:29:26