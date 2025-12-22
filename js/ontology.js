// js/ontology.js - 学習支援オントロジーの管理

class LearningOntology {
  constructor() {
    this.concepts = new Map();
    this.relations = new Map();
    this.learnerLevels = {};
  }

  // オントロジーデータの読み込み
  async loadOntology(ontologyData) {
    console.log("📚 学習支援オントロジーを読み込み中...");

    // 概念の追加
    for (const [conceptId, conceptData] of Object.entries(
      ontologyData.concepts
    )) {
      this.addConcept(conceptId, conceptData);
    }

    // 関係の追加
    for (const relation of ontologyData.relations) {
      this.addRelation(
        relation.from,
        relation.to,
        relation.type,
        relation.strength || 1.0
      );
    }

    // 学習者レベル定義の読み込み
    if (ontologyData.learnerLevels) {
      this.learnerLevels = ontologyData.learnerLevels;
    }

    console.log(`✅ ${this.concepts.size}個の概念を読み込みました`);
    console.log(`✅ ${this.relations.size}個の関係を読み込みました`);
  }

  // 概念の追加
  addConcept(id, properties) {
    this.concepts.set(id, {
      id: id,
      ...properties,
      addedAt: new Date(),
    });
  }

  // 関係の追加
  addRelation(fromConcept, toConcept, relationType, strength = 1.0) {
    const relationKey = `${fromConcept}-${relationType}-${toConcept}`;
    this.relations.set(relationKey, {
      from: fromConcept,
      to: toConcept,
      type: relationType,
      strength: strength,
    });
  }

  // 概念の取得
  getConcept(conceptId) {
    return this.concepts.get(conceptId);
  }

  // ⭐ 前提知識チェーンの取得（学習支援の核心機能）
  getPrerequisiteChain(conceptId, visited = new Set()) {
    if (visited.has(conceptId)) return [];
    visited.add(conceptId);

    const chain = [];
    const concept = this.concepts.get(conceptId);

    if (concept && concept.prerequisites) {
      for (const prereq of concept.prerequisites) {
        chain.push({
          conceptId: prereq,
          concept: this.concepts.get(prereq),
          depth: 1,
        });
        const subChain = this.getPrerequisiteChain(prereq, visited);
        subChain.forEach((item) => {
          item.depth += 1;
          chain.push(item);
        });
      }
    }

    return chain.sort((a, b) => b.depth - a.depth);
  }

  // ⭐ 難易度に応じた説明の取得
  getExplanation(conceptId, level = "beginner") {
    const concept = this.concepts.get(conceptId);
    if (!concept) return null;

    if (concept.explanations && concept.explanations[level]) {
      return {
        level: level,
        text: concept.explanations[level],
        concept: concept,
      };
    }

    return {
      level: "default",
      text: concept.description,
      concept: concept,
    };
  }

  // ⭐ よくある誤解の取得
  getMisconceptions(conceptId) {
    const concept = this.concepts.get(conceptId);
    if (!concept || !concept.misconceptions) return [];

    return concept.misconceptions.map((m, index) => ({
      id: `${conceptId}-misconception-${index}`,
      ...m,
    }));
  }

  // ⭐ 練習問題の取得
  getExercises(conceptId) {
    const concept = this.concepts.get(conceptId);
    if (!concept || !concept.exercises) return [];
    return concept.exercises;
  }

  // ⭐ 段階的ヒントの取得
  getHint(exerciseId, hintLevel = 0) {
    for (const [conceptId, concept] of this.concepts) {
      if (concept.exercises) {
        const exercise = concept.exercises.find((ex) => ex.id === exerciseId);
        if (exercise && exercise.hints && exercise.hints[hintLevel]) {
          return {
            hint: exercise.hints[hintLevel],
            currentLevel: hintLevel,
            totalHints: exercise.hints.length,
            hasMoreHints: hintLevel < exercise.hints.length - 1,
          };
        }
      }
    }
    return null;
  }

  // ⭐ 同義語・別名の取得（クエリ拡張用）
  getSynonyms(conceptId) {
    const concept = this.concepts.get(conceptId);
    if (!concept) return [];

    const synonyms = [concept.label];
    if (concept.synonyms) {
      synonyms.push(...concept.synonyms);
    }
    return synonyms;
  }

  // 関連概念の探索
  findRelatedConcepts(conceptId, maxDepth = 2) {
    const visited = new Set();
    const related = new Set();
    const queue = [{ concept: conceptId, depth: 0 }];

    while (queue.length > 0) {
      const { concept, depth } = queue.shift();
      if (visited.has(concept) || depth > maxDepth) continue;
      visited.add(concept);
      if (depth > 0) related.add(concept);

      for (const [key, relation] of this.relations) {
        if (relation.from === concept && !visited.has(relation.to)) {
          queue.push({ concept: relation.to, depth: depth + 1 });
        }
        if (relation.to === concept && !visited.has(relation.from)) {
          queue.push({ concept: relation.from, depth: depth + 1 });
        }
      }
    }

    return Array.from(related);
  }

  // 全概念のリスト取得
  getAllConcepts() {
    return Array.from(this.concepts.entries()).map(([id, data]) => ({
      id,
      ...data,
    }));
  }

  // デバッグ用
  printOntology() {
    console.log("=== 学習支援オントロジーの状態 ===");
    console.log("概念数:", this.concepts.size);
    console.log("関係数:", this.relations.size);

    console.log("\n概念一覧:");
    for (const [id, concept] of this.concepts) {
      const prereqs = concept.prerequisites?.join(", ") || "なし";
      const synonyms = concept.synonyms?.join(", ") || "なし";
      console.log(`- ${id}: ${concept.label}`);
      console.log(`  前提知識: ${prereqs}, 同義語: ${synonyms}`);
    }
  }
}