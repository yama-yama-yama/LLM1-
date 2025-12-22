// js/learning-support.js - 学習支援機能

class LearningSupport {
  constructor(ontology) {
    this.ontology = ontology;
    this.learnerProgress = new Map();
    this.currentHintLevels = new Map();
  }

  // ⭐ 前提知識チェック
  checkPrerequisites(conceptId, learnerKnowledge = []) {
    const prereqChain = this.ontology.getPrerequisiteChain(conceptId);

    const result = {
      conceptId: conceptId,
      conceptLabel: this.ontology.getConcept(conceptId)?.label || conceptId,
      allPrerequisites: prereqChain,
      missingPrerequisites: [],
      readyToLearn: true,
      recommendation: "",
    };

    for (const prereq of prereqChain) {
      if (!learnerKnowledge.includes(prereq.conceptId)) {
        result.missingPrerequisites.push(prereq);
        result.readyToLearn = false;
      }
    }

    if (!result.readyToLearn) {
      const missing = result.missingPrerequisites
        .map((p) => p.concept?.label || p.conceptId)
        .join("、");
      result.recommendation = `「${result.conceptLabel}」を学ぶ前に、まず「${missing}」を理解しましょう。`;
    } else {
      result.recommendation = `「${result.conceptLabel}」を学ぶ準備ができています！`;
    }

    return result;
  }

  // ⭐ 難易度適応型説明の生成
  generateAdaptiveExplanation(conceptId, learnerLevel = "beginner") {
    const concept = this.ontology.getConcept(conceptId);
    if (!concept) return null;

    const explanation = this.ontology.getExplanation(conceptId, learnerLevel);
    const misconceptions = this.ontology.getMisconceptions(conceptId);
    const exercises = this.ontology.getExercises(conceptId);
    const prereqs = this.ontology.getPrerequisiteChain(conceptId);

    return {
      concept: concept,
      level: learnerLevel,
      explanation: explanation.text,
      relatedMisconceptions: misconceptions.slice(0, 2),
      recommendedExercises: exercises.slice(0, 2),
      prerequisites: prereqs.map((p) => ({
        id: p.conceptId,
        label: p.concept?.label || p.conceptId,
      })),
      nextTopics: this.getNextTopics(conceptId),
    };
  }

  // ⭐ 段階的ヒントの生成
  getProgressiveHint(exerciseId) {
    const currentLevel = this.currentHintLevels.get(exerciseId) || 0;
    const hintInfo = this.ontology.getHint(exerciseId, currentLevel);

    if (hintInfo) {
      if (hintInfo.hasMoreHints) {
        this.currentHintLevels.set(exerciseId, currentLevel + 1);
      }
      return hintInfo;
    }

    return {
      hint: "これ以上のヒントはありません。もう一度問題を読み直してみましょう。",
      currentLevel: currentLevel,
      totalHints: 0,
      hasMoreHints: false,
    };
  }

  resetHint(exerciseId) {
    this.currentHintLevels.set(exerciseId, 0);
  }

  resetAllHints() {
    this.currentHintLevels.clear();
  }

  // ⭐ 次に学ぶべきトピックを推奨
  getNextTopics(currentConceptId) {
    const nextTopics = [];

    for (const [id, concept] of this.ontology.concepts) {
      if (
        concept.prerequisites &&
        concept.prerequisites.includes(currentConceptId)
      ) {
        nextTopics.push({
          id: id,
          label: concept.label,
          level: concept.level,
          reason: `「${
            this.ontology.getConcept(currentConceptId)?.label
          }」を理解したら次のステップ`,
        });
      }
    }

    return nextTopics;
  }

  // ⭐ よくある誤解への対応
  addressMisconception(conceptId, wrongBelief) {
    const misconceptions = this.ontology.getMisconceptions(conceptId);
    const lowerWrong = wrongBelief.toLowerCase();

    const matchingMisconception = misconceptions.find(
      (m) =>
        lowerWrong.includes(m.wrong.toLowerCase()) ||
        m.wrong.toLowerCase().includes(lowerWrong)
    );

    if (matchingMisconception) {
      return {
        found: true,
        misconception: matchingMisconception,
        response: `よくある誤解ですね！\n\n❌ 誤解: ${matchingMisconception.wrong}\n\n✅ 正しい理解: ${matchingMisconception.correct}\n\n💡 ヒント: ${matchingMisconception.hint}`,
      };
    }

    return {
      found: false,
      response: "その誤解についての情報は登録されていません。",
    };
  }

  // ⭐ 学習進捗の記録
  recordProgress(learnerId, conceptId, status) {
    if (!this.learnerProgress.has(learnerId)) {
      this.learnerProgress.set(learnerId, new Map());
    }

    const learnerData = this.learnerProgress.get(learnerId);
    learnerData.set(conceptId, {
      status: status,
      lastUpdated: new Date(),
      attempts: (learnerData.get(conceptId)?.attempts || 0) + 1,
    });
  }

  getProgress(learnerId) {
    const learnerData = this.learnerProgress.get(learnerId);
    if (!learnerData) return [];

    return Array.from(learnerData.entries()).map(([conceptId, data]) => ({
      conceptId,
      label: this.ontology.getConcept(conceptId)?.label || conceptId,
      ...data,
    }));
  }

  // ⭐ 学習パスの生成
  generateLearningPath(targetConceptId, learnerKnowledge = []) {
    const path = [];
    const prereqCheck = this.checkPrerequisites(
      targetConceptId,
      learnerKnowledge
    );

    for (const prereq of prereqCheck.missingPrerequisites) {
      if (!path.find((p) => p.conceptId === prereq.conceptId)) {
        path.push({
          conceptId: prereq.conceptId,
          label: prereq.concept?.label || prereq.conceptId,
          reason: "前提知識",
          order: prereq.depth,
        });
      }
    }

    path.push({
      conceptId: targetConceptId,
      label:
        this.ontology.getConcept(targetConceptId)?.label || targetConceptId,
      reason: "学習目標",
      order: 0,
    });

    return path.sort((a, b) => b.order - a.order);
  }
}