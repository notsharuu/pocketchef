import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  Dimensions,
  Alert,
  useColorScheme,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';

import {
  DEFAULT_BACKEND_URL,
  LIGHT_THEME,
  DARK_THEME,
  SCAN_STAGES,
  RECIPE_STAGES,
  DEFAULT_DB_CATEGORIES,
  DEFAULT_SUPPORTED_LANGUAGES,
} from './src/constants/theme';
import { computeWordSpans } from './src/utils/speech';
import {
  checkBackendHealth,
  fetchDbCategories,
  fetchTtsInfo,
  scanFridgeImages,
  generateRecipes,
  prepareSpeechStep,
  translateItemsBatch,
  buildSpeakAudioUrl,
} from './src/services/api';
import { styles } from './src/styles/appStyles';
import AppHeader from './src/components/AppHeader';
import BackendUrlModal from './src/components/BackendUrlModal';
import CaptureScreen from './src/screens/CaptureScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import RecipesScreen from './src/screens/RecipesScreen';
import RecipeDetailScreen from './src/screens/RecipeDetailScreen';
import NutritionScreen from './src/screens/NutritionScreen';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function App() {
  const systemScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemScheme === 'dark');
  const theme = isDarkMode ? DARK_THEME : LIGHT_THEME;

  // Connectivity & Settings
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);
  const [isUrlModalVisible, setIsUrlModalVisible] = useState(false);
  const [tempUrl, setTempUrl] = useState(DEFAULT_BACKEND_URL);

  // Navigation: 'capture' | 'inventory' | 'recipes' | 'recipeDetail'
  const [currentScreen, setCurrentScreen] = useState('capture');

  // Screen 1: Photo Capture & Scan
  const [stagedPhotos, setStagedPhotos] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStageIndex, setScanStageIndex] = useState(0);
  const [scanResult, setScanResult] = useState(null);

  // Screen 2: Inventory & Preferences
  const [checkedItems, setCheckedItems] = useState({});
  const [manualIngredientInput, setManualIngredientInput] = useState('');
  const [dbCategoriesData, setDbCategoriesData] = useState(DEFAULT_DB_CATEGORIES);
  const [selectedDbCategories, setSelectedDbCategories] = useState([]);

  // Screen 3 & 4: Recipes & Recipe Detail
  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState(false);
  const [recipeStageIndex, setRecipeStageIndex] = useState(0);
  const [recipesList, setRecipesList] = useState([]);
  const [selectedRecipeCategory, setSelectedRecipeCategory] = useState('All');
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // Voice Guide & Translation State
  const [speechLanguage, setSpeechLanguage] = useState('en');
  const [supportedLanguages, setSupportedLanguages] = useState(DEFAULT_SUPPORTED_LANGUAGES);
  const [ttsServerOnline, setTtsServerOnline] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPreparingSpeech, setIsPreparingSpeech] = useState(false);
  const [activeSpeechState, setActiveSpeechState] = useState(null);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [translatedIngredients, setTranslatedIngredients] = useState(null);

  const speechRequestIdRef = useRef(0);
  const speechAbortRef = useRef(null);
  const stopDictationRef = useRef(null);
  const audioPlayer = useAudioPlayer(null);
  const audioStatus = useAudioPlayerStatus(audioPlayer);

  // Loading & Swipe-Back Animation
  const progressAnim = useRef(new Animated.Value(0)).current;
  const stageIntervalRef = useRef(null);
  const swipeX = useRef(new Animated.Value(0)).current;
  const currentScreenRef = useRef(currentScreen);
  currentScreenRef.current = currentScreen;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    return () => {
      if (stageIntervalRef.current) clearInterval(stageIntervalRef.current);
      speechAbortRef.current?.abort();
      Speech.stop();
    };
  }, []);

  // Track active spoken word proportionally to audio playback progress
  useEffect(() => {
    if (!isSpeaking || !activeSpeechState?.spans?.length) return;
    const duration = audioStatus?.duration || 0;
    const currentTime = audioStatus?.currentTime || 0;
    if (duration > 0 && currentTime >= 0) {
      const ratio = Math.min(0.9999, Math.max(0, currentTime / duration));
      const idx = activeSpeechState.spans.findIndex(
        (s) => ratio >= s.startRatio && ratio <= s.endRatio
      );
      if (idx !== -1 && idx !== activeWordIndex) {
        setActiveWordIndex(idx);
      }
    }
  }, [audioStatus?.currentTime, audioStatus?.duration, isSpeaking, activeSpeechState]);

  useEffect(() => {
    if (audioStatus?.didJustFinish) {
      setIsSpeaking(false);
      setActiveWordIndex(-1);
    }
  }, [audioStatus?.didJustFinish]);

  // Refresh backend metadata whenever backendUrl changes
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await checkBackendHealth(backendUrl);
        if (!active) return;
        const [cats, ttsInfo] = await Promise.all([
          fetchDbCategories(backendUrl).catch(() => null),
          fetchTtsInfo(backendUrl).catch(() => null),
        ]);
        if (!active) return;
        if (cats) setDbCategoriesData(cats);
        if (ttsInfo?.languages?.length) setSupportedLanguages(ttsInfo.languages);
        if (ttsInfo) setTtsServerOnline(ttsInfo.online);
      } catch {
        // Silent retry when user updates URL
      }
    })();
    return () => {
      active = false;
    };
  }, [backendUrl]);

  // Translate ingredient & pantry lists automatically on RecipeDetail when non-English is active
  useEffect(() => {
    if (currentScreen !== 'recipeDetail' || !selectedRecipe || speechLanguage === 'en') {
      setTranslatedIngredients(null);
      return;
    }

    const used = selectedRecipe.ingredientsUsed || [];
    const additional = selectedRecipe.additionalIngredients || [];
    const pantry = selectedRecipe.missingIngredients || [];
    const combined = [...used, ...additional, ...pantry];
    if (combined.length === 0) {
      setTranslatedIngredients(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    translateItemsBatch(
      backendUrl,
      {
        items: combined,
        targetLanguage: speechLanguage,
        recipeId: selectedRecipe.id || selectedRecipe.title,
      },
      controller.signal
    )
      .then((data) => {
        if (cancelled || !Array.isArray(data?.items) || data.items.length !== combined.length) return;
        setTranslatedIngredients({
          used: data.items.slice(0, used.length),
          additional: data.items.slice(used.length, used.length + additional.length),
          pantry: data.items.slice(used.length + additional.length),
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [currentScreen, selectedRecipe, speechLanguage, backendUrl]);

  const stopDictation = useCallback(() => {
    speechRequestIdRef.current += 1;
    if (speechAbortRef.current) {
      try {
        speechAbortRef.current.abort();
      } catch {
        // Ignore abort errors
      }
      speechAbortRef.current = null;
    }
    Speech.stop();
    try {
      audioPlayer.pause();
    } catch {
      // Ignore if player has no source loaded
    }
    setIsSpeaking(false);
    setIsPreparingSpeech(false);
    setActiveWordIndex(-1);
  }, [audioPlayer]);

  stopDictationRef.current = stopDictation;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (currentScreenRef.current === 'capture') return false;
        const startedAtLeftEdge = evt.nativeEvent.pageX <= 45;
        const isHorizontalRightSwipe =
          gestureState.dx > 12 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.3;
        return startedAtLeftEdge && isHorizontalRightSwipe;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) swipeX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 75 || gestureState.vx > 0.55) {
          Animated.timing(swipeX, {
            toValue: SCREEN_WIDTH,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            swipeX.setValue(0);
            if (currentScreenRef.current === 'recipeDetail') {
              stopDictationRef.current?.();
            }
            setCurrentScreen((prev) =>
              prev === 'nutrition'
                ? 'recipeDetail'
                : prev === 'recipeDetail'
                ? 'recipes'
                : prev === 'recipes'
                ? 'inventory'
                : 'capture'
            );
          });
        } else {
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const speakRecipeStep = async (recipe, stepIndex) => {
    const steps = recipe?.steps || [];
    if (stepIndex < 0 || stepIndex >= steps.length) return;

    stopDictation();
    const myRequestId = speechRequestIdRef.current;
    const controller = new AbortController();
    speechAbortRef.current = controller;

    setIsPreparingSpeech(true);
    const rawStep = steps[stepIndex];

    try {
      let spokenText = rawStep;
      const langMeta =
        supportedLanguages.find((l) => l.code === speechLanguage) || supportedLanguages[0];

      if (speechLanguage !== 'en') {
        const prepData = await prepareSpeechStep(
          backendUrl,
          {
            text: rawStep,
            targetLanguage: speechLanguage,
            recipeId: recipe.id || recipe.title,
            stepIndex,
          },
          controller.signal
        );
        if (speechRequestIdRef.current !== myRequestId) return;
        if (prepData?.translatedText) spokenText = prepData.translatedText;
      }

      if (speechRequestIdRef.current !== myRequestId || currentScreenRef.current !== 'recipeDetail') {
        return;
      }

      const spans = computeWordSpans(spokenText);
      const recipeKey = recipe.id || recipe.title;

      setActiveSpeechState({
        recipeId: recipeKey,
        stepIndex,
        spokenText,
        translatedText: spokenText !== rawStep ? spokenText : '',
        spans,
      });
      setActiveWordIndex(0);
      setIsPreparingSpeech(false);
      setIsSpeaking(true);

      const fallbackSpeak = () => {
        if (speechRequestIdRef.current !== myRequestId) return;
        Speech.speak(spokenText, {
          language: langMeta?.speechLocale || 'en-IN',
          rate: 0.92,
          onBoundary: (event) => {
            if (speechRequestIdRef.current !== myRequestId) return;
            if (typeof event?.charIndex === 'number') {
              const wIdx = spans.findIndex(
                (s) => event.charIndex >= s.startChar && event.charIndex < s.endChar
              );
              if (wIdx !== -1) setActiveWordIndex(wIdx);
            }
          },
          onDone: () => {
            if (speechRequestIdRef.current !== myRequestId) return;
            setIsSpeaking(false);
            setActiveWordIndex(-1);
          },
          onStopped: () => {
            if (speechRequestIdRef.current !== myRequestId) return;
            setIsSpeaking(false);
            setActiveWordIndex(-1);
          },
          onError: () => {
            if (speechRequestIdRef.current !== myRequestId) return;
            setIsSpeaking(false);
            setActiveWordIndex(-1);
          },
        });
      };

      if (ttsServerOnline) {
        try {
          if (speechRequestIdRef.current !== myRequestId) return;
          const audioUri = buildSpeakAudioUrl(backendUrl, {
            text: spokenText,
            language: speechLanguage,
          });
          audioPlayer.replace({ uri: audioUri });
          audioPlayer.play();
        } catch {
          fallbackSpeak();
        }
      } else {
        fallbackSpeak();
      }
    } catch (err) {
      if (err?.name === 'AbortError' || speechRequestIdRef.current !== myRequestId) return;
      setIsPreparingSpeech(false);
      setIsSpeaking(false);
      setActiveWordIndex(-1);
      Alert.alert('Dictation Error', err.message || 'Could not dictate this step.');
    }
  };

  const startProgressAnimation = (stages, setStageIdx, maxDuration = 7000) => {
    if (stageIntervalRef.current) clearInterval(stageIntervalRef.current);
    progressAnim.setValue(0);
    setStageIdx(0);

    Animated.timing(progressAnim, {
      toValue: 90,
      duration: maxDuration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    let currentIdx = 0;
    stageIntervalRef.current = setInterval(() => {
      currentIdx = (currentIdx + 1) % stages.length;
      setStageIdx(currentIdx);
    }, 1750);
  };

  const completeProgressAnimation = () => {
    if (stageIntervalRef.current) {
      clearInterval(stageIntervalRef.current);
      stageIntervalRef.current = null;
    }
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: 300,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  };

  const addFromCamera = async () => {
    if (stagedPhotos.length >= 8) {
      Alert.alert('Limit Reached', 'You can stage a maximum of 8 shelf photos per scan.');
      return;
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is required to take photos of your fridge.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
        base64: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        setStagedPhotos((prev) => [...prev, result.assets[0]]);
      }
    } catch (err) {
      Alert.alert('Camera Error', err.message || 'Could not open camera.');
    }
  };

  const addFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library access is required to select fridge photos.');
        return;
      }
      const remainingSlots = 8 - stagedPhotos.length;
      if (remainingSlots <= 0) {
        Alert.alert('Limit Reached', 'You can stage a maximum of 8 shelf photos per scan.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.9,
        base64: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setStagedPhotos((prev) => [...prev, ...result.assets].slice(0, 8));
      }
    } catch (err) {
      Alert.alert('Gallery Error', err.message || 'Could not open photo library.');
    }
  };

  const handleScanSubmit = async () => {
    if (stagedPhotos.length === 0) {
      Alert.alert('No Photos', 'Please add at least one shelf photo to scan.');
      return;
    }
    setIsScanning(true);
    startProgressAnimation(SCAN_STAGES, setScanStageIndex, 6500);

    try {
      const imagesPayload = stagedPhotos.map((p) => ({
        imageBase64: p.base64,
        mimeType: p.mimeType || 'image/jpeg',
      }));
      const data = await scanFridgeImages(backendUrl, imagesPayload);
      completeProgressAnimation();

      setTimeout(() => {
        setScanResult(data);
        const initialChecked = {};
        if (Array.isArray(data.items)) {
          data.items.forEach((item) => {
            initialChecked[item.name] = true;
          });
        }
        setCheckedItems(initialChecked);
        setIsScanning(false);
        setCurrentScreen('inventory');
      }, 250);
    } catch (err) {
      if (stageIntervalRef.current) {
        clearInterval(stageIntervalRef.current);
        stageIntervalRef.current = null;
      }
      setIsScanning(false);
      Alert.alert(
        'Scan Failed',
        `${err.message}\n\nPlease check that your backend is running at ${backendUrl}.`
      );
    }
  };

  const handleAddManualIngredient = () => {
    if (!manualIngredientInput || !manualIngredientInput.trim()) return;

    // Check if user separated items with punctuation or conjunctions
    const hasPunctuation = /[,;+\n\t]|\band\b/i.test(manualIngredientInput);
    let entries = [];

    if (hasPunctuation) {
      entries = manualIngredientInput
        .split(/[,;+\n\t]|\band\b/i)
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean);
    } else {
      // Space-separated input (e.g. "paneer chicken bacon"), protecting known multi-word ingredients
      const KNOWN_MULTI_WORD = [
        'sweet potato', 'raw mango', 'green chilli', 'green chili', 'red chilli', 'red chili',
        'curry leaves', 'mustard seeds', 'cumin seeds', 'coriander leaves', 'coriander seeds',
        'fenugreek leaves', 'garam masala', 'chaat masala', 'coconut milk', 'tomato sauce',
        'tomato ketchup', 'black pepper', 'bell pepper', 'cottage cheese', 'bitter gourd',
        'bottle gourd', 'ridge gourd', 'snake gourd', 'ivy gourd', 'french beans', 'green beans',
        'kidney beans', 'chick peas', 'bengal gram', 'black gram', 'green gram', 'bay leaf',
        'cinnamon stick', 'lemon juice', 'lime juice', 'sesame seeds', 'kasuri methi',
        'ginger garlic paste', 'green peas'
      ];

      let text = manualIngredientInput.trim();
      KNOWN_MULTI_WORD.forEach((mw) => {
        const reg = new RegExp('\\b' + mw + '\\b', 'gi');
        text = text.replace(reg, (match) => ' __MW_' + match.replace(/\s+/g, '_') + '_MW__ ');
      });

      entries = text
        .split(/\s+/)
        .map((tok) => {
          if (tok.startsWith('__MW_') && tok.endsWith('_MW__')) {
            return tok.slice(5, -5).replace(/_/g, ' ');
          }
          return tok;
        })
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean);
    }

    if (entries.length === 0) return;

    const existingItems = scanResult?.items || [];
    const updatedItems = [...existingItems];
    const nextChecked = { ...checkedItems };

    entries.forEach((entry) => {
      const existingMatch = updatedItems.find((i) => i.name.toLowerCase() === entry);
      if (existingMatch) {
        nextChecked[existingMatch.name] = true;
      } else {
        updatedItems.push({ name: entry, status: 'seen' });
        nextChecked[entry] = true;
      }
    });

    setScanResult((prev) => ({ items: updatedItems, notes: prev?.notes || [] }));
    setCheckedItems(nextChecked);
    setManualIngredientInput('');
  };

  const handleGenerateRecipes = async () => {
    const selectedList = Object.keys(checkedItems).filter((key) => checkedItems[key]);
    if (selectedList.length === 0) {
      Alert.alert('No Ingredients Selected', 'Please check at least one ingredient to generate recipes.');
      return;
    }

    setIsGeneratingRecipes(true);
    startProgressAnimation(RECIPE_STAGES, setRecipeStageIndex, 3500);

    try {
      const data = await generateRecipes(backendUrl, {
        ingredients: selectedList,
        notes: scanResult?.notes || [],
        categories: selectedDbCategories,
        limit: 12,
      });
      completeProgressAnimation();

      setTimeout(() => {
        setRecipesList(data.recipes || []);
        setSelectedRecipeCategory('All');
        setSelectedRecipe(null);
        setIsGeneratingRecipes(false);
        setCurrentScreen('recipes');
      }, 50);
    } catch (err) {
      if (stageIntervalRef.current) {
        clearInterval(stageIntervalRef.current);
        stageIntervalRef.current = null;
      }
      setIsGeneratingRecipes(false);
      Alert.alert('Recipe Generation Failed', err.message);
    }
  };

  const startNewScan = () => {
    stopDictation();
    setStagedPhotos([]);
    setScanResult(null);
    setCheckedItems({});
    setRecipesList([]);
    setSelectedDbCategories([]);
    setSelectedRecipe(null);
    progressAnim.setValue(0);
    setCurrentScreen('capture');
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const selectedCount = Object.values(checkedItems).filter(Boolean).length;
  const filteredRecipes =
    selectedRecipeCategory === 'All'
      ? recipesList
      : recipesList.filter((r) => r.category === selectedRecipeCategory);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <AppHeader
        currentScreen={currentScreen}
        isDarkMode={isDarkMode}
        theme={theme}
        styles={styles}
        onToggleTheme={() => setIsDarkMode((prev) => !prev)}
        onOpenSettings={() => {
          setTempUrl(backendUrl);
          setIsUrlModalVisible(true);
        }}
        onBack={() => {
          if (currentScreen === 'nutrition') {
            setCurrentScreen('recipeDetail');
          } else if (currentScreen === 'recipeDetail') {
            stopDictation();
            setCurrentScreen('recipes');
          } else if (currentScreen === 'recipes') {
            setCurrentScreen('inventory');
          } else if (currentScreen === 'inventory') {
            setCurrentScreen('capture');
          }
        }}
      />

      <Animated.View
        style={{ flex: 1, transform: [{ translateX: swipeX }] }}
        {...panResponder.panHandlers}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {currentScreen === 'capture' && (
            <CaptureScreen
              theme={theme}
              styles={styles}
              isScanning={isScanning}
              stagedPhotos={stagedPhotos}
              progressWidth={progressWidth}
              scanStageIndex={scanStageIndex}
              scanStageText={SCAN_STAGES[scanStageIndex]}
              onAddFromCamera={addFromCamera}
              onAddFromGallery={addFromGallery}
              onOpenManualInventory={() => {
                if (!scanResult) setScanResult({ items: [], notes: [] });
                setCurrentScreen('inventory');
              }}
              onClearAllStaged={() => setStagedPhotos([])}
              onRemovePhotoAtIndex={(idx) =>
                setStagedPhotos((prev) => prev.filter((_, i) => i !== idx))
              }
              onScanSubmit={handleScanSubmit}
            />
          )}

          {currentScreen === 'inventory' && scanResult && (
            <InventoryScreen
              theme={theme}
              styles={styles}
              scanResult={scanResult}
              checkedItems={checkedItems}
              selectedCount={selectedCount}
              manualIngredientInput={manualIngredientInput}
              dbCategoriesData={dbCategoriesData}
              selectedDbCategories={selectedDbCategories}
              isGeneratingRecipes={isGeneratingRecipes}
              progressWidth={progressWidth}
              recipeStageText={RECIPE_STAGES[recipeStageIndex]}
              onBackToScanner={() => setCurrentScreen('capture')}
              onStartNewScan={startNewScan}
              onChangeManualInput={setManualIngredientInput}
              onAddManualIngredient={handleAddManualIngredient}
              onToggleItemCheck={(name) =>
                setCheckedItems((prev) => ({ ...prev, [name]: !prev[name] }))
              }
              onToggleAllItems={(selectAll) => {
                const next = {};
                (scanResult.items || []).forEach((item) => {
                  next[item.name] = selectAll;
                });
                setCheckedItems(next);
              }}
              onClearDbCategories={() => setSelectedDbCategories([])}
              onToggleDbCategory={(cat) =>
                setSelectedDbCategories((prev) =>
                  prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
                )
              }
              onGenerateRecipes={handleGenerateRecipes}
            />
          )}

          {currentScreen === 'recipes' && (
            <RecipesScreen
              theme={theme}
              styles={styles}
              filteredRecipes={filteredRecipes}
              selectedRecipeCategory={selectedRecipeCategory}
              selectedCount={selectedCount}
              onSelectRecipeCategory={setSelectedRecipeCategory}
              onBackToInventory={() => setCurrentScreen('inventory')}
              onStartNewScan={startNewScan}
              onSelectRecipe={(recipe) => {
                stopDictation();
                setSelectedRecipe(recipe);
                setActiveSpeechState(null);
                setCurrentScreen('recipeDetail');
              }}
            />
          )}

          {currentScreen === 'recipeDetail' && selectedRecipe && (
            <RecipeDetailScreen
              theme={theme}
              styles={styles}
              backendUrl={backendUrl}
              selectedRecipe={selectedRecipe}
              supportedLanguages={supportedLanguages}
              speechLanguage={speechLanguage}
              translatedIngredients={translatedIngredients}
              activeSpeechState={activeSpeechState}
              activeWordIndex={activeWordIndex}
              isSpeaking={isSpeaking}
              isPreparingSpeech={isPreparingSpeech}
              onBackToRecipes={() => {
                stopDictation();
                setCurrentScreen('recipes');
              }}
              onStartNewScan={startNewScan}
              onSelectLanguage={(code) => {
                stopDictation();
                setSpeechLanguage(code);
                setActiveSpeechState(null);
              }}
              onSpeakStep={speakRecipeStep}
              onStopDictation={stopDictation}
              onOpenNutrition={() => setCurrentScreen('nutrition')}
            />
          )}

          {currentScreen === 'nutrition' && selectedRecipe && (
            <NutritionScreen
              theme={theme}
              styles={styles}
              selectedRecipe={selectedRecipe}
            />
          )}
        </KeyboardAvoidingView>
      </Animated.View>

      <BackendUrlModal
        visible={isUrlModalVisible}
        tempUrl={tempUrl}
        theme={theme}
        styles={styles}
        onChangeTempUrl={setTempUrl}
        onCancel={() => setIsUrlModalVisible(false)}
        onSave={() => {
          let cleaned = tempUrl.trim().replace(/\/+$/, '');
          if (cleaned && !/^https?:\/\//i.test(cleaned)) {
            cleaned = `http://${cleaned}`;
          }
          if (cleaned) setBackendUrl(cleaned);
          setIsUrlModalVisible(false);
        }}
      />
    </SafeAreaView>
  );
}
