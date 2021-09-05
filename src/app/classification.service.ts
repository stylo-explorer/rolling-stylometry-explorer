import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  BehaviorSubject,
  combineLatest,
  ReplaySubject,
} from 'rxjs';
import { map, shareReplay, filter, switchMap, first } from 'rxjs/operators';
import { DataService } from './data.service';

const assertSlicesFile = false;
const sliceSize = 5000;
const sliceOverlap = 500;

export type ClassificationData = {
  // Data structure
  mfw: number;
  color: {
    [author: string]: string;
  };
  ignoredWords: string[] | undefined;
  language: string;
  data: Array<{
    start: number;
    end: number;
    results: Array<{
      author: string;
      score: string;
    }>;
  }>;
};

interface Match {
  color: Color;
  author: string;
  score: number;
}

interface TextSegment {
  start: number;
  end: number;
  text: string;
}

export interface ClassifiedTextSegment extends TextSegment {
  bestMatch?: Match;
  matches: Array<Match>;
  color: Color;
}

export interface InputData {
  title: string;
  year: string;
  authorNames: AuthorNameRelation[];
  results: ClassificationSettingsAndResults[];
}

export interface AuthorNameRelation {
  shortName: string;
  fullName: string;
}

export interface ClassificationSettingsAndResults {
  name: string;
  configurations: string;
  data: ClassificationData[];
}

function inputIsNotNullOrUndefined<T>(input: null | undefined | T): input is T {
  return input !== null && input !== undefined;
}
function isNotNullOrUndefined<T>() {
  return (source$: Observable<null | undefined | T>) =>
    source$.pipe(filter(inputIsNotNullOrUndefined));
}

interface Color {
  r: number;
  g: number;
  b: number;
}
@Injectable()
export class ClassificationService {
  public enableTooltip = false;
  public readonly mfw$ = new BehaviorSubject<number>(0);
  public readonly classification$: Observable<Array<ClassificationData>>;

  public readonly type$ = new BehaviorSubject<string>('');
  public readonly mfwMin$: Observable<number>;
  public readonly mfwMax$: Observable<number>;
  public readonly mfwStep$: Observable<number>;
  public readonly mfwValues$: Observable<Array<number>>;
  public readonly textSegments$: Observable<Array<ClassifiedTextSegment>>;
  public readonly chapterSegments$: Observable<Array<number>>;
  public readonly colorGradient$ = new BehaviorSubject(false);
  public readonly bookViewportWidth$ = new ReplaySubject<number>(0);

  public readonly availableTypes$: Observable<string[]>;
  public readonly colors$: Observable<Map<string, Color>>;

  public set mfw(mfw: number | string) {
    if (typeof mfw === 'string') {
      this.mfw$.next(Number.parseInt(mfw, 10));
    } else {
      this.mfw$.next(mfw);
    }
  }

  constructor(private http: HttpClient, private data: DataService) {
    this.availableTypes$ = data.rawClassificationData$.pipe(
      map((input) => input.results.map((result) => result.name))
    );
    this.availableTypes$
      .pipe(first())
      .subscribe((types) => this.type$.next(types[0]));

    this.classification$ = combineLatest([
      data.rawClassificationData$,
      this.type$,
    ]).pipe(
      map(([input, selectedType]) => {
        const matchingData = input.results.find(
          (data) => data.name === selectedType
        );
        if (matchingData) {
          return matchingData.data;
        }
        return input.results[0].data;
      })
    );

    this.mfwValues$ = this.classification$.pipe(
      map((classifications) =>
        classifications
          .map((classification) => classification.mfw)
          .sort((a, b) => a - b)
      )
    );
    this.mfwMin$ = this.mfwValues$.pipe(map((values) => values[0]));
    this.mfwMin$.subscribe((value) => this.mfw$.next(value));
    this.mfwMax$ = this.mfwValues$.pipe(
      map((values) => values[values.length - 1])
    );
    this.mfwStep$ = this.mfwValues$.pipe(
      map((values) => {
        const steps = new Array<number>();
        for (let i = 0; i < values.length - 1; i++) {
          steps.push(values[i + 1] - values[i]);
        }
        return steps.sort()[0];
      })
    );

    const selectedClassification$ = combineLatest([
      this.classification$,
      this.mfw$,
    ]).pipe(
      map(([classificationData, mfw]) =>
        classificationData.find((classification) => classification.mfw === mfw)
      ),
      isNotNullOrUndefined()
    );

    this.colors$ = selectedClassification$.pipe(
      map((classificationData) => this.extractColors(classificationData))
    );

    const words$ = combineLatest([
      this.data.book$,
      selectedClassification$,
    ]).pipe(
      map(([book, classification]) => {
        let words = book.split('\n').join(' \n');
        if (
          ['english', 'english.contr'].includes(
            classification.language.toLowerCase()
          )
        ) {
          words = words.split('’').join(' ’');
        }
        if (['english'].includes(classification.language.toLowerCase())) {
          words = words.split('-').join(' -');
        }
        return words.split(' ');
      }),
      shareReplay()
    );

    const ignoredWords$ = selectedClassification$.pipe(
      map((classification) =>
        (classification.ignoredWords || []).map((word) => word.toLowerCase())
      )
    );

    if (assertSlicesFile) {
      this.assertSlicesFile(words$, ignoredWords$);
    }

    const segments$ = combineLatest([
      words$.pipe(map(this.removeChapterMarks)),
      this.mfwStep$,
      ignoredWords$,
    ]).pipe(
      map(([words, wordCount, ignoredWords]) =>
        this.joinSegments([...words], wordCount, ignoredWords)
      ),
      shareReplay()
    );

    const chapterMarkPositions$ = words$.pipe(
      map(this.findChapterMarkPositions)
    );
    this.chapterSegments$ = combineLatest([
      chapterMarkPositions$,
      this.mfwStep$,
    ]).pipe(
      map(([chapterMarkPositions, wordCount]) =>
        chapterMarkPositions.map((position) => Math.floor(position / wordCount))
      )
    );

    this.textSegments$ = combineLatest([
      segments$,
      selectedClassification$,
      this.colors$,
    ]).pipe(
      map(([segments, classificationResults, colors]) => {
        return segments.map((segment) =>
          this.classify(segment, classificationResults, colors)
        );
      }),
      switchMap((segments) =>
        this.colorGradient$.pipe(
          map((showGradient) => {
            if (!showGradient) {
              return segments.map((segment) => this.addBestMatchColor(segment));
            } else {
              return segments.map((segment) =>
                this.addMatchColorGradient(segment)
              );
            }
          })
        )
      )
    );
  }

  assertSlicesFile(
    words$: Observable<string[]>,
    ignoredWords$: Observable<string[]>
  ) {
    const slices$ = this.http.get('/assets/content/slices.json');
    const styloWords$ = slices$.pipe(
      map((sliceData: string[][]) => {
        const words = new Array<string>();
        const nthItem = sliceSize / sliceOverlap;
        for (let i = 0; i < sliceData.length; i++) {
          if (i % nthItem === 0) {
            words.push(...sliceData[i]);
          }
          if (i === sliceData.length - 1) {
            words.push(
              ...sliceData[i].slice((nthItem - (i % nthItem)) * sliceOverlap)
            );
          }
        }
        return words;
      })
    );
    const ourWords$ = combineLatest([words$, ignoredWords$]).pipe(
      map(([words, ignoredWords]) =>
        words.filter((word) => this.isRealWord(word, ignoredWords))
      )
    );
    combineLatest([ourWords$, styloWords$]).subscribe(
      ([ourWords, styloWords]) => {
        for (let i = 0; i < Math.min(ourWords.length, styloWords.length); i++) {
          if (
            ourWords[i]
              .toLowerCase()
              .replace(/[^\w\s]/gi, '')
              .trim() !==
            styloWords[i]
              .toLowerCase()
              .replace(/[^\w\s]/gi, '')
              .trim()
          ) {
            console.error(
              `Different word detected at ${i}. Ours: ${ourWords[i]}, stylo's: ${styloWords[i]}`
            );
            break;
          }
        }

        if (ourWords.length < styloWords.length) {
          console.error(
            `Different word detected at. We have less: ${styloWords
              .slice(
                styloWords.length - 1 - (styloWords.length - ourWords.length)
              )
              .join('; ')}`
          );
        }
        // Case where we have more is ignored as style is truncating the text while slicing (the last words are missing)
      }
    );
  }

  private extractColors(
    classificationData: ClassificationData
  ): Map<string, Color> {
    const colors = new Map<string, Color>();
    for (const author in classificationData.color) {
      colors.set(author, this.rgbaToRgb(classificationData.color[author]));
    }
    return colors;
  }
  private rgbaToRgb(color: string): Color {
    // An Farbcodes kommen --> bekomme ich über colors übergeben

    // RGBA-Wert aufteilen
    const r = parseInt(color.substr(1, 2), 16);
    const g = parseInt(color.substr(3, 2), 16);
    const b = parseInt(color.substr(5, 2), 16);
    const a = parseInt(color.substr(7, 2), 16) / 255;

    return {
      r: Math.floor(r * a + 0xff * (1 - a)),
      g: Math.floor(g * a + 0xff * (1 - a)),
      b: Math.floor(b * a + 0xff * (1 - a)),
    };

    // Mischen
    // Zurückgeben
  }

  private joinSegments(
    words: Array<string>,
    wordCount: number,
    ignoreWords: string[]
  ) {
    const result = new Array<TextSegment>();
    let start = 0;
    let offset = 0;
    while (offset + 1 < words.length) {
      const realWordCount = this.getRealWordElementCount(
        words.slice(offset, offset + wordCount * 2),
        wordCount,
        ignoreWords
      );
      result.push({
        start,
        end: start + wordCount,
        text: words.slice(offset, offset + realWordCount).join(' '),
      });
      start += wordCount;
      offset += realWordCount;
    }

    return result;
  }

  private getRealWordElementCount(
    words: string[],
    wordCount: number,
    ignoreWords: string[]
  ): number {
    let realWordCount = 0;
    let i = 0;

    for (i = 0; i < words.length && realWordCount < wordCount; i++) {
      if (this.isRealWord(words[i], ignoreWords)) {
        realWordCount++;
      }
    }
    return i;
  }

  private realWordCache: { [key: string]: boolean } = {};

  private isRealWord(word: string, ignoreWords: string[]) {
    if (this.realWordCache[word]) {
      return this.realWordCache[word];
    }
    const result =
      !!word.replace(/[^A-ZΑ-ΩÀ-ÿ]/gi, '').trim() &&
      !ignoreWords.includes(word.trim().toLowerCase());
    this.realWordCache[word] = result;
    return result;
  }

  private removeChapterMarks(words: string[]): string[] {
    return words.filter((word) => word.trim() !== '"xmilestone"');
  }

  private findChapterMarkPositions(words: string[]): number[] {
    return words.reduce(
      (indexes, word, i) =>
        word.trim() === '"xmilestone"'
          ? [...indexes, i - 1 - indexes.length]
          : indexes,
      new Array<number>()
    );
  }

  private classify(
    segment: TextSegment,
    classificationResults: ClassificationData,
    colors: Map<string, Color>
  ): Omit<ClassifiedTextSegment, 'color'> {
    const relevantClassificationResults = classificationResults.data.filter(
      (result) => result.start <= segment.start && segment.end <= result.end
    );

    const authorMap = new Map<string, number>();
    for (const segmentResult of relevantClassificationResults) {
      for (const author of segmentResult.results) {
        authorMap.set(
          author.author,
          authorMap.get(author.author) || 0.0 + Number.parseFloat(author.score)
        );
      }
    }

    const matches = new Array<Match>();
    for (const author of authorMap.keys()) {
      authorMap.set(
        author,
        (authorMap.get(author) || 0) / relevantClassificationResults.length
      );
      matches.push({
        author,
        color: this.authorColor(author, colors),
        score: authorMap.get(author) || 0,
      });
    }
    const sortedMatches = matches.sort((a, b) => b.score - a.score);

    return {
      ...segment,
      bestMatch: sortedMatches[0],
      matches: sortedMatches,
    };
  }

  private addBestMatchColor(
    segment: Omit<ClassifiedTextSegment, 'color'>
  ): ClassifiedTextSegment {
    return {
      ...segment,
      color: segment.bestMatch
        ? segment.bestMatch.color
        : { r: 255, g: 255, b: 255 },
    };
  }

  private addMatchColorGradient(
    segment: Omit<ClassifiedTextSegment, 'color'>
  ): ClassifiedTextSegment {
    return {
      ...segment,
      color: this.colorGradient(segment),
    };
  }

  private colorGradient(segment: Omit<ClassifiedTextSegment, 'color'>): Color {
    if (segment.matches.length >= 2) {
      return this.mixColors(
        [segment.matches[0].score, segment.matches[0].color],
        [segment.matches[1].score, segment.matches[1].color]
      );
    } else {
      return { r: 255, g: 25, b: 255 };
    }
  }

  public toRgb(color: Color): string {
    return `#${this.colorHex(color.r)}${this.colorHex(color.g)}${this.colorHex(
      color.b
    )}`;
  }

  private colorHex(color: number): string {
    return color.toString(16).padStart(2, '0');
  }
  private mixColors(...colors: [number, Color][]): Color {
    const scoreSum = colors.reduce((sum, value) => sum + value[0], 0);
    return colors.reduce(
      (sum, value) => ({
        r: Math.floor(sum.r + (value[1].r * value[0]) / scoreSum),
        g: Math.floor(sum.g + (value[1].g * value[0]) / scoreSum),
        b: Math.floor(sum.b + (value[1].b * value[0]) / scoreSum),
      }),
      { r: 0, g: 0, b: 0 }
    );
  }

  private fromRgb(color: string): Color {
    return {
      r: Number.parseInt(color.slice(1, 3), 16),
      g: Number.parseInt(color.slice(3, 5), 16),
      b: Number.parseInt(color.slice(5, 7), 16),
    };
  }

  private authorColor(author: string, colors: Map<string, Color>): Color {
    return colors.get(author) || { r: 255, g: 0, b: 0 };
  }
}
