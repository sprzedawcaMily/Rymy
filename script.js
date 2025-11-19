document.addEventListener('DOMContentLoaded', () => {
    // --- Elementy DOM ---
    const textInput = document.getElementById('text-input');
    const lineNumbers = document.getElementById('line-numbers');
    const syllableCounts = document.getElementById('syllable-counts');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const paintArea = document.getElementById('paint-area');
    const colorPalette = document.getElementById('color-palette');
    const autoRhymeBtn = document.getElementById('auto-rhyme-btn');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');
    const imperfectRhymesCheck = document.getElementById('imperfect-rhymes-check');
    
    // Statystyki
    const statLines = document.getElementById('stat-lines');
    const statWords = document.getElementById('stat-words');
    const statSyllables = document.getElementById('stat-syllables');

    // --- Stan Aplikacji ---
    let currentText = "";
    let selectedColor = null;
    const colors = [
        '#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', 
        '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff', 
        '#e5e5e5', '#f4a261', '#2a9d8f', '#e9c46a'
    ];
    
    // Mapa słowo -> kolor (dla malowania)
    // Kluczem będzie unikalne ID słowa (linia_indeks)
    let wordColors = new Map(); 

    // --- Inicjalizacja ---
    initPalette();
    updateStats();

    // --- Event Listeners ---
    
    // Obsługa zakładek
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
            
            if (btn.dataset.tab === 'paint') {
                renderPaintArea();
            }
        });
    });

    // Synchronizacja scrollowania w edytorze
    textInput.addEventListener('scroll', () => {
        lineNumbers.scrollTop = textInput.scrollTop;
        syllableCounts.scrollTop = textInput.scrollTop;
    });

    // Wprowadzanie tekstu
    textInput.addEventListener('input', () => {
        currentText = textInput.value;
        updateEditorView();
        updateStats();
    });

    // Auto-Rymy
    autoRhymeBtn.addEventListener('click', () => {
        detectRhymes();
        // Przełącz na zakładkę malowania, jeśli nie jesteśmy
        if (!document.getElementById('paint-tab').classList.contains('active')) {
            document.querySelector('[data-tab="paint"]').click();
        } else {
            renderPaintArea();
        }
    });

    // Kopiowanie
    copyBtn.addEventListener('click', () => {
        const stats = `Wersy: ${countLines(currentText)} | Słowa: ${countWords(currentText)}`;
        const textToCopy = `${currentText}\n\n--- Statystyki ---\n${stats}`;
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = copyBtn.innerText;
            copyBtn.innerText = "Skopiowano! ✅";
            setTimeout(() => copyBtn.innerText = originalText, 2000);
        });
    });

    // Czyszczenie
    clearBtn.addEventListener('click', () => {
        if(confirm("Czy na pewno chcesz wyczyścić wszystko?")) {
            textInput.value = "";
            currentText = "";
            wordColors.clear();
            updateEditorView();
            updateStats();
            renderPaintArea();
        }
    });

    // --- Funkcje Logiki ---

    function initPalette() {
        colors.forEach((color, index) => {
            const swatch = document.createElement('div');
            swatch.classList.add('color-swatch');
            swatch.style.backgroundColor = color;
            swatch.addEventListener('click', () => selectColor(color, swatch));
            if (index === 0) selectColor(color, swatch);
            colorPalette.appendChild(swatch);
        });
    }

    function selectColor(color, element) {
        selectedColor = color;
        document.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('selected'));
        if(element) element.classList.add('selected');
    }

    function updateEditorView() {
        const lines = currentText.split('\n');
        
        // Aktualizacja numerów linii
        lineNumbers.innerHTML = lines.map((_, i) => `<div>${i + 1}</div>`).join('');
        
        // Aktualizacja licznika sylab
        syllableCounts.innerHTML = lines.map(line => {
            const count = countSyllables(line);
            return `<div>${count || '-'}</div>`;
        }).join('');
    }

    function updateStats() {
        const lines = countLines(currentText);
        const words = countWords(currentText);
        const syllables = currentText.split('\n').reduce((acc, line) => acc + countSyllables(line), 0);

        statLines.innerText = `Wersy: ${lines}`;
        statWords.innerText = `Słowa: ${words}`;
        statSyllables.innerText = `Sylaby (suma): ${syllables}`;
    }

    // --- Algorytmy Językowe (Polski) ---

    function countLines(text) {
        if (!text.trim()) return 0;
        return text.split('\n').length;
    }

    function countWords(text) {
        if (!text.trim()) return 0;
        return text.trim().split(/\s+/).length;
    }

    function countSyllables(text) {
        if (!text) return 0;
        // Prosty licznik sylab dla języka polskiego oparty na samogłoskach
        // Samogłoski: a, ą, e, ę, i, o, ó, u, y
        // Uwaga: 'i' przed samogłoską często zmiękcza i nie tworzy sylaby (np. 'nie-bo' vs 'ma-ria')
        // To jest uproszczona implementacja.
        
        const vowels = /[aąeęioóuyAĄEĘIOÓUY]/g;
        const matches = text.match(vowels);
        if (!matches) return 0;
        
        // Korekta dla 'i' + samogłoska (np. 'ia', 'ie', 'io', 'iu') - traktujemy jako jedną sylabę fonetycznie w wielu przypadkach
        // Ale w poezji często liczy się to różnie. Przyjmijmy standardową zasadę: każda samogłoska to sylaba, 
        // chyba że 'i' jest przed inną samogłoską (dwuznaki typu 'ia').
        
        let count = matches.length;
        
        // Znajdź wystąpienia 'i' po których następuje inna samogłoska
        const iVowel = /i[aąeęoóuy]/gi;
        const iMatches = text.match(iVowel);
        if (iMatches) {
            count -= iMatches.length;
        }
        
        return Math.max(1, count); // Słowo musi mieć min 1 sylabę jeśli ma litery
    }

    // --- Malowanie i Rymy ---

    function renderPaintArea() {
        paintArea.innerHTML = '';
        const lines = currentText.split('\n');

        lines.forEach((line, lineIndex) => {
            const lineDiv = document.createElement('div');
            lineDiv.classList.add('paint-line');
            
            const words = line.split(/(\s+)/); // Zachowaj spacje
            
            words.forEach((word, wordIndex) => {
                if (word.trim().length === 0) {
                    lineDiv.appendChild(document.createTextNode(word));
                    return;
                }

                const span = document.createElement('span');
                span.innerText = word;
                span.classList.add('paint-word');
                
                // Unikalne ID dla słowa
                const wordId = `${lineIndex}-${wordIndex}`;
                span.dataset.id = wordId;
                span.dataset.cleanWord = cleanWord(word);

                // Przywróć kolor jeśli istnieje
                if (wordColors.has(wordId)) {
                    span.style.backgroundColor = wordColors.get(wordId);
                }

                span.addEventListener('click', () => {
                    if (selectedColor) {
                        // Toggle color
                        if (wordColors.get(wordId) === selectedColor) {
                            wordColors.delete(wordId);
                            span.style.backgroundColor = 'transparent';
                        } else {
                            wordColors.set(wordId, selectedColor);
                            span.style.backgroundColor = selectedColor;
                        }
                    }
                });

                lineDiv.appendChild(span);
            });

            paintArea.appendChild(lineDiv);
        });
    }

    function cleanWord(word) {
        return word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    }

    function getRhymePart(word, imperfect = false) {
        word = cleanWord(word);
        if (word.length < 2) return word;

        // Dla rymów dokładnych: bierzemy ostatnie samogłoski i spółgłoski od ostatniej akcentowanej
        // W PL akcent pada zwykle na przedostatnią sylabę.
        // Uproszczenie: weźmy wszystko od przedostatniej samogłoski.
        
        const vowels = ['a', 'ą', 'e', 'ę', 'i', 'o', 'ó', 'u', 'y'];
        let vowelIndices = [];
        for (let i = 0; i < word.length; i++) {
            if (vowels.includes(word[i])) {
                vowelIndices.push(i);
            }
        }

        if (vowelIndices.length < 1) return word; // Brak samogłosek

        // Jeśli słowo jednosylabowe, bierzemy całe (lub od samogłoski)
        if (vowelIndices.length === 1) {
            return word.substring(vowelIndices[0]); 
        }

        // Standardowo: od przedostatniej samogłoski
        const penultVowelIndex = vowelIndices[vowelIndices.length - 2];
        
        if (imperfect) {
            // Rymy niedokładne (asonanse): interesują nas tylko samogłoski od akcentu
            // Np. "krowa" -> "o-a", "mowa" -> "o-a", "woda" -> "o-a" (to się rymuje niedokładnie)
            let suffix = word.substring(penultVowelIndex);
            let rhymeSignature = "";
            for(let char of suffix) {
                if (vowels.includes(char)) {
                    rhymeSignature += char;
                }
            }
            return rhymeSignature;
        } else {
            // Rymy dokładne: cały sufiks od przedostatniej samogłoski
            return word.substring(penultVowelIndex);
        }
    }

    function detectRhymes() {
        wordColors.clear();
        const lines = currentText.split('\n');
        const lastWords = []; // { word, lineIndex, wordIndex, rhymePart }

        // 1. Znajdź ostatnie słowa w każdej linii
        lines.forEach((line, lineIndex) => {
            const words = line.trim().split(/\s+/);
            if (words.length > 0 && words[0] !== "") {
                const lastWord = words[words.length - 1];
                // Musimy znaleźć dokładny indeks tego słowa w oryginalnym podziale na tokeny w renderPaintArea
                // To jest trochę trudne bo split(/\s+/) gubi spacje, a tam mamy split(/(\s+)/)
                // Uprośćmy: znajdźmy to słowo w strukturze renderowania po prostu biorąc ostatni token niebędący spacją
                
                // Symulacja tokenizacji z renderPaintArea
                const tokens = line.split(/(\s+)/);
                let foundIndex = -1;
                for (let i = tokens.length - 1; i >= 0; i--) {
                    if (tokens[i].trim().length > 0) {
                        foundIndex = i;
                        break;
                    }
                }

                if (foundIndex !== -1) {
                    const isImperfect = imperfectRhymesCheck.checked;
                    lastWords.push({
                        text: lastWord,
                        id: `${lineIndex}-${foundIndex}`,
                        rhymePart: getRhymePart(lastWord, isImperfect)
                    });
                }
            }
        });

        // 2. Grupuj rymy
        const rhymeGroups = {};
        lastWords.forEach(item => {
            if (!rhymeGroups[item.rhymePart]) {
                rhymeGroups[item.rhymePart] = [];
            }
            rhymeGroups[item.rhymePart].push(item);
        });

        // 3. Przypisz kolory
        let colorIndex = 0;
        Object.values(rhymeGroups).forEach(group => {
            if (group.length > 1) { // Tylko jeśli coś się z czymś rymuje
                const color = colors[colorIndex % colors.length];
                group.forEach(item => {
                    wordColors.set(item.id, color);
                });
                colorIndex++;
            }
        });
    }
});
