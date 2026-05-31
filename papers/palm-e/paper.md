                                                                     PaLM-E: An Embodied Multimodal Language Model

                                                     Danny Driess 1 2 Fei Xia 1 Mehdi S. M. Sajjadi 3 Corey Lynch 1 Aakanksha Chowdhery 3
                                                 Brian Ichter 1 Ayzaan Wahid 1 Jonathan Tompson 1 Quan Vuong 1 Tianhe Yu 1 Wenlong Huang 1
                                                  Yevgen Chebotar 1 PierrePROMPT:
                                                                             Sermanet 1 Daniel Duckworth
                                                                           Q: How can embodied language   PROMPT:
                                                                                                                  3
                                                                                                                     Sergey Levine 1 Vincent Vanhoucke 1
                                                                  1       models benefit 2              3  Language models1which understand
                                                  Karol Hausman Marc PREDICTION:         robots? A:
                                                                          Toussaint Klaus Greff Andy             Zeng
                                                                                                          robot sensor        Igor Mordatch 3 Pete Florence 1
                                                                                                                       data can
                                                                                               Embodied language models can               PREDICTION:
                                                                                            1 benefit robots by allowing them to
                                                                                                                              2            be used to generate natural
                                                                                                                             3 descriptions of the
                                                                                             Robotics at Google TU Berlin
                                                                                                                       language Google
                                                                                              learn language in a more natural
                                                                                             way.                      robot's environment.
                                                                                                                                            Research
                                                                                                    https://palm-e.github.io

                                           Mobile Manipulation                                                                                                                     Task and Motion Planning
                                                                                               PaLM-E: An Embodied Multimodal Language Model
                                                                                                                                                                                                     Given <emb> Q: How
                                                                                               Given <emb> … <img> Q: How to grasp blue block? A: First, grasp yellow block
                                                                                                                                                                                                     to grasp blue block?




arXiv:2303.03378v1 [cs.LG] 6 Mar 2023
                                                                                                         ?        ViT                                                                                A: First grasp yellow
                                                                                                                                                                                                     block and place it on
                                                                                                        …          …                                                                                 the table, then grasp
                                                                                                                                                                                                     the blue block.
                                                                                                                       Large Language Model (PaLM)
                                          Human: Bring me the rice chips from the                                                                                                  Tabletop Manipulation
                                                                                                        …          …
                                          drawer. Robot: 1. Go to the drawers, 2. Open
                                                                                                                                                                                                     Given <img> Task: Sort
                                          top drawer. I see <img>. 3. Pick the green rice
                                                                                                                                                                                                     colors into corners.
                                          chip bag from the drawer and place it on the                                 Control               A: First, grasp yellow block and …                      Step 1. Push the green
                                          counter.
                                                                                                                                                                                                     star to the bottom left.    Scene Unde
                                          Visual Q&A, Captioning …                                                                                                                                   Step 2. Push the green
                                                                                                                                      Language Only Tasks
                                                                                                               Describe the                                                                          circle to the green star.
                                                            Given <img>. Q: What’s in the                      following <img>:      Here is a Haiku about
                                                            image? Answer in emojis.                           A dog jumping         embodied language models:       Q: Miami Beach borders which ocean? A: Atlantic.               TBD
                                                            A: 🍏🍌🍇🍐🍑🍈🍒.                                                                                                                                                              TBD
                                                                                                               over a hurdle at a    Embodied language               Q: What is 372 x 18? A: 6696.
                                                                                                               dog show.             models are the future of        Language models trained on robot sensor data can
                                                                                                                                     natural language                be used to guide a robot’s actions.

                                        Figure 1: PaLM-E is a single general-purpose multimodal language model for embodied reasoning tasks, visual-language tasks,                                                              Visual Q&A
                                        and language tasks. PaLM-E transfers knowledge from visual-language domains into embodied reasoning – from robot planning in
                                        environments with complex dynamics and physical constraints, to answering questions about the observable world. PaLM-E operates on
                                                                                                                                                                                                                                     TBD
                                        multimodal sentences, i.e. sequences of tokens where inputs from arbitrary modalities (e.g. images, neural 3D representations, or states, in
                                        green and blue) are inserted alongside text tokens (in orange) as input to an LLM, trained end-to-end.

                                                                            Abstract                                                  1. Introduction
                                        Large language models have been demonstrated to perform                                       Large language models (LLMs) demonstrate strong reason-
                                        complex tasks. However, enabling general inference in the                                     ing capabilities across various domains, including dialogue
                                        real world, e.g. for robotics problems, raises the challenge                                  (Glaese et al., 2022; Thoppilan et al., 2022), step-by-step
                                        of grounding. We propose embodied language models to di-                                      reasoning (Wei et al., 2022; Kojima et al., 2022), math prob-
                                        rectly incorporate real-world continuous sensor modalities                                    lem solving (Lewkowycz et al., 2022; Polu et al., 2022), and
                                        into language models and thereby establish the link be-                                       code writing (Chen et al., 2021a). However, a limitation of
                                        tween words and percepts. Input to our embodied language                                      such models for inference in the real world is the issue of
                                        model are multi-modal sentences that interleave visual, con-                                  grounding: while training LLMs on massive textual data
                                        tinuous state estimation, and textual input encodings. We                                     may lead to representations that relate to our physical world,
                                        train these encodings end-to-end, in conjunction with a pre-                                  connecting those representations to real-world visual and
                                        trained large language model, for multiple embodied tasks                                     physical sensor modalities is essential to solving a wider
                                        including sequential robotic manipulation planning, visual                                    range of grounded real-world problems in computer vision
                                        question answering, and captioning. Our evaluations show                                      and robotics (Tellex et al., 2020). Previous work (Ahn et al.,
                                        that PaLM-E, a single large embodied multimodal model,                                        2022) interfaces the output of LLMs with learned robotic
                                        can address a variety of embodied reasoning tasks, from a                                     policies and affordance functions to make decisions, but is
                                        variety of observation modalities, on multiple embodiments,                                   limited in that the LLM itself is only provided with textual
                                        and further, exhibits positive transfer: the model benefits                                   input, which is insufficient for many tasks where the geo-
                                        from diverse joint training across internet-scale language,                                   metric configuration of the scene is important. Further, in
                                        vision, and visual-language domains. Our largest model,                                       our experiments we show that current state-of-the-art visual-
                                        PaLM-E-562B with 562B parameters, in addition to being                                        language models trained on typical vision-language tasks
                                        trained on robotics tasks, is a visual-language generalist                                    such as visual-question-answering (VQA) cannot directly
                                        with state-of-the-art performance on OK-VQA, and retains                                      solve robotic reasoning tasks.
                                        generalist language capabilities with increasing scale.                                       In this paper we propose embodied language models, which
                                                            PaLM-E: An Embodied Multimodal Language Model

  Visually-conditioned Jokes + Few-shot prompting                     Robot Visual Perception, Dialogue, and Planning                     Robot: I am a robot operating in a kitchen. Given
                                                                                                                                          <img>, what do I see? a bowl of eggs, a bowl of
                        I see (image omitted). Description: A cow                                     flour, and a bowl of sugar.. and a spatula.. and a spoon.. and a bag of flour.. and a bag of
                        sitting on a rug. Joke: Why is the cow                                        sugar. When a human asks me to do a task, I will respond with the sequence of actions
                        sitting on a rug? Because it wants to be a                                    I would do to accomplish the task with only the items I see. Human: Use all of the
                        cow-ch! … I see <img>. Description: a                                         ingredients you see to make a cake batter. 1. crack egg. 2. put egg in bowl. 3. put flour
                        donkey is carrying a dog, cat, and rooster.                                   in bowl. 4. put sugar in bowl. 5. mix. 6. put in pan. 7. bake. 8. eat. 9. clean up.
                        Joke: what do you call a donkey with a
                        rooster on his back. A rooster booster.                                           Physical Prediction             Spatial Grounding           Given <img> . Q: What
                                                                             Given <img>. Q: If a                                                                     flavor is the doughnut
  Zero-shot Multimodal Chain-of-Thought                     Robot Initiative robot wanted to be                       Given <img> .                              on the right? Strawberry.. Q:
                                                                             useful here, what                        Q: What will                               What flavor is the doughnut
                   Given <img>. Q: Can I go down                             steps should it take?                    the robot do                               on the left? A blueberry.
                   this street on a bicycle, yes or                          A: clean table..pick                     next? A: fall.
                   no? A: Let’s think step by step.                          up trash.. pick up
                                                                                                                                       Photo 1: <img1>. Photo 2: <img2>. Q: What is in Photo 1
                   1. do not enter. 2. except                                chairs.. wipe chairs..
                                                                                                                                       but NOT in Photo 2? A: sunglasses.
                   bicycles. 3. do not entry except                          put chairs down.
                                                                                                                                       Photo 1: <img1>. Photo 2: <img2>. Q: What is in Photo 1
                   bicycles. 4. yes.                                                                                                   but NOT in Photo 2? A: Let’s think step by step and
                                                             Zero-shot: Multi-image Relationships
                                                                                                                                       explain. Photo 1 has sunglasses on top of folded
                   Given <img>. Q: How many                                                Q: Where is                                 clothes. Photo 2 does not have sunglasses on top of
                   championship rings did the player                                       <img1> in this                              folded clothes. Therefore, sunglasses are in Photo 1 but
                   on the left win in his career A: Let’s                                  scene <img2>? A:                            not in Photo 2.
                   think step by step. 1. kobe bryant is                                   a stove top with a
                   on the left. 2. kobe bryant has won                                                                                 End-to-End Egocentric Q&A, Dialogue
                                                                                           pot on it.
                   5 championship rings.
                                                                                    OCR-free Math Reasoning Given <img> .                                   Photo 1, at 10:30 am: <img1>.
                      Given <img>. Q: Who are the two teams playing in this                                                                                 Photo 2, at 12:45 pm: <img2>.
                      photo, and which was the last to win a championship, and                        Q: I am getting just two
                                                                                                                                                            Photo 3, at 3:45 pm: <img3>.
                      which year did they win, and who was their star player that                     custom pizza for me and my
                                                                                                                                                            Q: I forget, what did I have for
                      year? A: Let's think step by step. 1. team in white is new                      friend. How much should I
                                                                                                                                                            lunch, and what time was it? A:
 york knick. 2. team in green is boston celtic. 3. last to win championship was                       pay in total? A: Let's think
                                                                                                                                                            Let’s think step by step.
 boston celtic. 4. year was 2008. 5. star player was paul pierce. 6. i am not                         step by step. 1st step: 2
                                                                                                                                                            1. you had a sandwich for lunch.
 sure if this is correct. i am not basketball fan. i just google it.                                  custom pizzas. 2nd step: 2 x
                                                                                                                                                            2. it was 12:45 pm.
                                                                                                      $9.99. 3rd step: $19.98.

Figure 2: PaLM-E-562B can do zero-shot multimodal chain-of-thought reasoning, can tell visually-conditioned jokes given an image, and
demonstrates an array of robot-relevant multimodal-informed capabilities including perception, visually-grounded dialogue, and planning.
PaLM-E also generalizes, zero-shot, to multi-image prompts despite only being trained on single-image prompts. PaLM-E can also
perform math given an image with textually-interleaved handwritten numbers. In addition, the model can perform, zero-shot, question and
answering on temporally-annotated egocentric vision, similar to what was shown in (Zeng et al., 2022) but end-to-end all in one model.

directly incorporate continuous inputs from sensor modali-                                         efficiency for robotics tasks,Physical Reasoning
                                                                                                                                  e.g. significantly increasing
                                                                                                                                                    Given <img> . Q:
                                                                                                                                                    Which of these
ties of an embodied agent and thereby enable the language                                          learning success from handfuls of training examples,         and
                                                                                                                                                    objects is best for
model itself to make more grounded inferences for sequen-                                          even demonstrating one-shot or zero-shot generalization         to
                                                                                                                                                    climbing up high?

tial decision making in the real world. Inputs such as images                                      novel combinations of objects or unseen objects.A: ladder.
and state estimates are embedded into the same latent embed-
                                                                                                   We scale PaLM-E up to 562B parameters, integrating the
ding as language tokens and processed by the self-attention
                                                                                                   540B PaLM (Chowdhery et al., 2022) LLM and the 22B
layers of a Transformer-based LLM in the same way as text.
                                                                                                   Vision Transformer (ViT) (Dehghani et al., 2023) into, to
We start from a pre-trained LLM in which we inject the
                                                                                                   our knowledge, the largest vision-language model currently
continuous inputs through an encoder. These encoders are
                                                                                                   reported. PaLM-E-562B achieves state-of-the-art perfor-
trained end-to-end to output sequential decisions in terms of
                                                                                                   mance on the OK-VQA (Marino et al., 2019) benchmark,
natural text that can be interpreted by the embodied agent
                                                                                                   without relying on task-specific finetuning. Although not
by conditioning low-level policies or give an answer to an
                                                                                                   the focus of our experimentation, we also find (Fig. 2) that
embodied question. We evaluate the approach in a vari-
                                                                                                   PaLM-E-562B exhibits a wide array of capabilities includ-
ety of settings, comparing different input representations
                                                                                                   ing zero-shot multimodal chain-of-thought (CoT) reasoning,
(e.g. standard vs. object-centric ViT encodings for visual
                                                                                                   few-shot prompting, OCR-free math reasoning, and multi-
input), freezing vs. finetuning the language model while
                                                                                                   image reasoning, despite being trained on only single-image
training the encoders, and investigating whether co-training
                                                                                                   examples. Zero-shot CoT (Kojima et al., 2022), originally a
on multiple tasks enables transfer.
                                                                                                   language-only concept, has been shown on multimodal data
To investigate the approach’s breadth, we evaluate on three                                        with task-specific programs (Zeng et al., 2022) but to our
robotic manipulation domains (two of which are closed-                                             knowledge, not via an end-to-end model.
loop in the real-world), standard visual-language tasks such
                                                                                                   To summarize our main contributions, we (1) propose
as VQA and image captioning, as well as language tasks.
                                                                                                   and demonstrate that a generalist, transfer-learned, multi-
Our results indicate that multi-task training improves perfor-
                                                                                                   embodiment decision-making agent can be trained via mix-
mance compared to training models on individual tasks. We
                                                                                                   ing in embodied data into the training of a multimodal large
show that this transfer across tasks can lead to high data-
                                      PaLM-E: An Embodied Multimodal Language Model

language model. We show that, (2) while current state-of-        rectly leverage the world knowledge embedded in its param-
the-art general-purpose visual-language models out-of-the-       eters. This enables not only embodied reasoning but also
box (zero-shot) do not well address embodied reasoning           question answering, as demonstrated in our experiments.
problems, it is possible to train a competent general-purpose    Among works that output actions, perhaps most similar is
visual-language model that is also an efficient embodied         the approach proposed in Gato (Reed et al., 2022) which,
reasoner. In studying how to best train such models, we (3)      like PaLM-E, is a generalist multi-embodiment agent. In
introduce novel architectural ideas such as neural scene rep-    contrast to Gato, we demonstrate positive transfer across
resentations and entity-labeling multimodal tokens. Finally,     different tasks where the model benefits from diverse joint
in addition to our focus on PaLM-E as an embodied reasoner       training across multiple domains.
we (4) show that PaLM-E is also a quantitatively compe-
                                                                 LLMs in embodied task planning. There have been sev-
tent vision and language generalist, and (5) demonstrate
                                                                 eral methods proposed to leverage LLMs in embodied do-
that scaling the language model size enables multimodal
                                                                 mains. While many works focus on understanding natural
finetuning with less catastrophic forgetting.
                                                                 language goals (Lynch & Sermanet, 2020; Shridhar et al.,
                                                                 2022a; Nair et al., 2022; Lynch et al., 2022), fewer con-
2. Related Work                                                  sider natural language as a representation for planning –
General vision-language modeling. Building on suc-               the focus of this work. LLMs contain vast amounts of in-
cesses in large language (Brown et al., 2020; Devlin et al.,     ternalized knowledge about the world (Bommasani et al.,
2018) and vision (Dosovitskiy et al., 2020) models, recent       2021), but without grounding, generated plans may be im-
years have seen a growing interest in large vision-language      possible to execute. One line of research has employed
models (VLMs) (Li et al., 2019; Lu et al., 2019; Hao et al.,     prompting to elicit a sequence of instructions directly from
2022; Gan et al., 2022). Unlike their predecessors, VLMs         an LLM either by leveraging semantic similarity between an
are capable of simultaneously understanding both images          LLM’s generation and an eligible set of instructions (Huang
and text, and can be applied to tasks such as visual ques-       et al., 2022b), incorporating affordance functions (Ahn et al.,
tion answering (Zhou et al., 2020; Zellers et al., 2021b),       2022), visual feedback (Huang et al., 2022c), generating
captioning (Hu et al., 2022), optical character recognition      world models (Nottingham et al., 2023; Zellers et al., 2021a),
(Li et al., 2021), and object detection (Chen et al., 2021b).    planning over graphs and maps (Shah et al., 2022; Huang
The methods by which images are integrated varies. For ex-       et al., 2022a), visual explanations (Wang et al., 2023), pro-
ample, Alayrac et al. (2022) augments pretrained language        gram generation (Liang et al., 2022; Singh et al., 2022), or
models with a mechanism to directly attend to a single con-      injecting information into the prompt (Zeng et al., 2022). In
text image. In contrast, PaLM-E represents images and            contrast, PaLM-E is trained to generate plans directly with-
text as “multimodal sentences” of latent vectors, allowing       out relying on auxiliary models for grounding. This in turn
it to process multiple images in a flexible way within any       enables direct integration of the rich semantic knowledge
part of a sentence. More closely related to our work is          stored in pretrained LLMs into the planning process.
Frozen (Tsimpoukelli et al., 2021) where vision encoder          With few exceptions, the parameters of the LLMs employed
parameters are optimized via backpropagation through a           in many of these works are employed as-is without further
frozen LLM (Lu et al., 2021). Inspired by this work, we          training. In LID (Li et al., 2022), this constraint is relaxed
investigate the design in a broader scope by introducing         and LLM parameters are finetuned to produce a planning net-
alternative input modalities (e.g. neural scene representa-      work for generating high-level instructions. (SL)3 (Sharma
tions), and our proposed approach empirically outperforms        et al., 2021) tackles the more challenging task of simulta-
Frozen by more than 45% on the VQAv2 benchmark. More             neously finetuning two LLMs: a planning network, which
importantly we demonstrate that PaLM-E is applicable not         produces high-level instructions, and a low-level policy net-
only to perceptual but also embodied tasks.                      work, which selects actions. With PaLM-E, our interests
                                                                 are distinct and complementary: we investigate a generalist,
Actions-output models. Prior works focus on combining
                                                                 multi-embodiment model, across multiple modalities.
vision and language inputs in an embodied setting with the
goal of direct action prediction (Guhur et al., 2022; Shridhar
et al., 2022b;a; Zhang & Chai, 2021; Silva et al., 2021; Jang    3. PaLM-E: An Embodied Multimodal
et al., 2022; Nair et al., 2022; Lynch et al., 2022; Brohan         Language Model
et al., 2022). Among these methods, VIMA (Jiang et al.,
2022) explores multimodal prompts similar to PaLM-E. The         The main architectural idea of PaLM-E is to inject continu-
role of language is perhaps most aptly described as task         ous, embodied observations such as images, state estimates,
specification in these works. In contrast, PaLM-E generates      or other sensor modalities into the language embedding
high-level instructions as text; in doing so, the model is       space of a pre-trained language model. This is realized by
able to naturally condition upon its own predictions and di-     encoding the continuous observations into a sequence of
                                          PaLM-E: An Embodied Multimodal Language Model

vectors with the same dimension as the embedding space of           γ : W → X , i.e. pLM (wl |x1:l−1 ) with xi = γ(wi ) ∈ Rk .
the language tokens. The continuous information is hence            The mapping γ is typically represented as a large embed-
injected into the language model in an analogous way to             ding matrix of size k × |W| and trained end-to-end. In our
language tokens. PaLM-E is a decoder-only LLM that gen-             case, |W| = 256 000 (Chowdhery et al., 2022).
erates textual completions autoregressively given a prefix or
                                                                    Multi-modal sentences: injection of continuous observa-
prompt. We call our model PaLM-E, since we use PaLM
                                                                    tions. Multi-modal information such as image observations
(Chowdhery et al., 2022) as the pre-trained language model,
                                                                    can be injected into the LLM by skipping the discrete token
and make it Embodied.
                                                                    level and directly mapping the continuous observations into
The inputs to PaLM-E consist of text and (multiple) con-            the language embedding space X . To this end, we train an
tinuous observations. The multimodal tokens correspond-             encoder φ : O → X q that maps a (continuous) observa-
ing to these observations are interleaved with the text             tion space O (refer to Sec. 4 for details) into a sequence of
to form multi-modal sentences. An example of such a                 q-many vectors in X . These vectors are then interleaved
multi-modal sentence is Q: What happened between                    with normal embedded text tokens to form the prefix for the
<img 1> and <img 2>? where <img i> represents an em-                LLM. This means that each vector xi in the prefix is formed
bedding of an image. The output of PaLM-E is text gen-              from either the word token embedder γ or an encoder φi :
erated auto-regressively by the model, which could be an                   (
answer to a question, or a sequence of decisions produced by                 γ(wi )      if i a is text token, or
                                                                      xi =                                                    (3)
PaLM-E in textual form that should be executed by a robot.                   φj (Oj )i if i corresponds to observation Oj .
When PaLM-E is tasked with producing decisions or plans,
we assume that there exists a low-level policy or planner that      Note that a single observation Oj is usually encoded into
can translate these decisions into low-level actions. Prior         multiple embedding vectors. It is possible to interleave
work has discussed a variety of ways to train such low-level        different encoders φi at different locations in the prefix
policies (Lynch & Sermanet, 2020; Brohan et al., 2022), and         to combine, e.g., information from different observation
we use these prior methods directly without modification.           spaces. Injecting the continuous information this way into
In the following, we describe our approach more formally.           the LLM reuses its existing positional encodings. In contrast
Decoder-only LLMs. Decoder-only large language models               to other VLM approaches (e.g, (Chen et al., 2022)), the
(LLMs) are generative models trained to predict the proba-          observation embeddings are not inserted at fixed positions,
bility p(w1:L ) of a piece of text w1:L = (w1 , . . . , wL ) that   but instead placed dynamically within the surrounding text.
is represented as a sequence of tokens wi ∈ W. Typical              Embodying the output: PaLM-E in a robot control loop.
neural architectures realize this by factorizing into               PaLM-E is a generative model producing text based on
                                                                    multi-model sentences as input. In order to connect the
                           L
                           Y                                        output of the model to an embodiment, we distinguish two
              p(w1:L ) =         pLM (wl |w1:l−1 ),          (1)
                                                                    cases. If the task can be accomplished by outputting text
                           l=1
                                                                    only as, e.g., in embodied question answering or scene
where pLM is a large transformer network.                           description tasks, then the output of the model is directly
                                                                    considered to be the solution for the task.
Prefix-decoder-only LLMs. Since the LLM is auto-
regressive, a pre-trained model can be conditioned on a             Alternatively, if PaLM-E is used to solve an embodied plan-
prefix w1:n without the necessity to change the architecture        ning or control task, it generates text that conditions low-
                                                                    level commands. In particular, we assume to have access to
                                 L
                                 Y                                  policies that can perform low-level skills from some (small)
        p(wn+1:L |w1:n ) =            pLM (wl |w1:l−1 ).     (2)    vocabulary, and a successful plan from PaLM-E must con-
                              l=n+1                                 sist of a sequence of such skills. Note that PaLM-E must
                                                                    determine on its own which skills are available based on
The prefix or prompt w1:n provides the context based on
                                                                    the training data and the prompt, and no other mechanism
which the LLM continues to predict the subsequent tokens
                                                                    is used to constrain or filter its outputs. Although these
wn+1:L . This is often used for inference to steer the predic-
                                                                    policies are language conditioned, they are not capable of
tions of the model. For example, the prompt can contain a
                                                                    solving long-horizon tasks or taking in complex instructions.
description of the task the LLM should solve or examples
                                                                    PaLM-E is hence integrated into a control-loop, where its
of desired text completions for similar tasks.
                                                                    predicted decisions are executed through the low-level poli-
Token embedding space. The tokens wi are elements of a              cies by a robot, leading to new observations based on which
fixed vocabulary W which is a discrete, finite set correspond-      PaLM-E is able to replan if necessary. In this sense, PaLM-
ing to (sub)words in natural language. Internally, the LLM          E can be understood as a high-level policy that sequences
embeds wi into a word token embedding space X ⊂ Rk via              and controls the low-level policies.
                                      PaLM-E: An Embodied Multimodal Language Model

4. Input & Scene Representations for                             tecture (Locatello et al., 2020). Based on SRT (Sajjadi
   Different Sensor Modalities                                   et al., 2022b), OSRT learns 3D-centric neural scene rep-
                                                                 resentations on in-domain data through a novel view syn-
In this section, we describe the individual modalities that we
                                                                 thesis task. Its scene representations consist of object slots
incorporate into PaLM-E, and how we set up their encoders.
                                                                 oj = φ̄OSRT (I1:v )j ∈ Rk̄ . We project each of these slots
We propose different architectural choices for each encoder
                                                                 into xj1:m = ψ(φ̄OSRT (I1:v )j ) with an MLP ψ. Note that
φ : O → X to map the corresponding modality into the
                                                                 individual objects are always tokenized into multiple em-
language embedding space. We investigate state estimation
                                                                 beddings each, i.e. ψ : Rk̄ → Rm×k for OSRT maps into
vectors, Vision Transformers (ViTs) (Dosovitskiy et al.,
                                                                 m-many embeddings.
2020; Chen et al., 2022; Ryoo et al., 2021) for 2D image
features, and the 3D-aware Object Scene Representation           Entity referrals. For embodied planning tasks, PaLM-E
Transformer (OSRT) (Sajjadi et al., 2022a). In addition to       must be able to reference objects in its generated plan. In
encoders that represent the input scene globally, we consider    many cases, including the majority of our experiments,
object-centric representations that factor observations into     objects in a scene can be identified in natural language
tokens that represent individual objects in the scene.           by some of their unique properties. However, there
                                                                 also exist settings where objects are not easily identifi-
State estimation vectors. State vectors, e.g. from a robot
                                                                 able by language in few words, e.g. if there are multi-
or a state estimate for objects, are perhaps the simplest to
                                                                 ple blocks on a table of the same color at different loca-
input into PaLM-E. Let s ∈ RS be a vector describing the
                                                                 tions. For object-centric representations such as OSRT, we
state of the objects in a scene. For example, s could contain
                                                                 label the multi-modal tokens corresponding to an object
the pose, size, color etc. of those objects. Then, the MLP
                                                                 in the input prompt as follows: Object 1 is <obj 1>.
φstate maps s into the language embedding space.
                                                                 . . . Object j is <obj j>. This enables PaLM-E to ref-
Vision Transformer (ViT). ViT φ̃ViT (Dosovitskiy et al.,         erence objects via special tokens of the form obj j in its
2020) is a transformer architecture mapping an image I           generated output sentences. In this case, we assume that the
into a number of token embeddings x̃1:m = φ̃ViT (I) ∈            low-level policies operate on these tokens as well.
Rm×k̃ . We consider several variants, including the 4 billion
parameter model from Chen et al. (2022), which we refer to       5. Training Recipes
as ViT-4B, and a similar 22 billion parameter model, ViT-        PaLM-E       is trained N on a dataset of the form D =
22B (Dehghani et al., 2023), both of which have been pre-
                                                                  i          i
                                                                    I1:ui , w1:L i
                                                                                   , ni   i=1
                                                                                              , where each example i consists of
trained on image classification. We further investigate the      ui -many continuous observations Iji , a text w1:Li
                                                                                                                        , and an
                                                                                                                      i
ViT token learner architecture (ViT + TL) (Ryoo et al., 2021)    index ni . Despite being a decoder-only model, the text
which is trained end-to-end from scratch. Note that the          consists of a prefix part up to index ni that is formed from
dimensionality k̃ of the ViT embeddings is not necessarily       multi-modal sentences, and the prediction target, which only
the same as that of the language model. We therefore project     contains text tokens. The loss function is therefore a cross-
each embedding into xi = φViT (I)i = ψ(φ̃ViT (I)i ) with ψ       entropy loss averaged over the individual non-prefix tokens
being a learned affine transformation.                           wni i +1:Li . To form the multi-modal sentences within the
Object-centric representations. Unlike language, visual          model, we have special tokens in the text that get replaced
input is not pre-structured into meaningful entities and rela-   by the embedding vectors of the encoders at the locations
tionships: while ViT may capture semantics, the structure of     in the text of those tokens. We base PaLM-E on the pre-
the representation resembles a static grid rather than a col-    trained 8B, 62B, and 540B parameter variants of PaLM as
lection of object instances. This poses a challenge both for     the decoder-only LLM into which we inject the continuous
interfacing with LLMs which have been pre-trained on sym-        observations through the input encoders. Those encoders
bols, and for solving embodied reasoning which requires          are either pre-trained or trained from scratch, see Sec. 4. We
interaction with physical objects. We therefore also explore     refer to an 8B LLM combined with a 4B ViT as PaLM-E-
structured encoders that aim to separate visual inputs into      12B, similarly a 62B LLM + 22B ViT as PaLM-E-84B, and
distinct objects before injecting them into the LLM. Given       540B LLM + 22B ViT as PaLM-E-562B.
ground-truth object instance masks Mj , we can decompose         Variation with Model freezing. Most of our architectures
ViT’s representation into xj1:m = φViT (Mj ◦ I) for object j.    consist of three parts, an encoder φ̃, a projector ψ, and the
Object Scene Representation Transformer (OSRT). An               LLM pLM . When training PaLM-E, one way is to update
alternative that does not require ground-truth segmentations     the parameters of all these components. However, LLMs
is OSRT (Sajjadi et al., 2022a): rather than relying on ex-      show impressive reasoning capabilities if supplied with a
ternal knowledge about objects, they are discovered in an        suitable prompt (Wei et al., 2022). Therefore, we investigate
unsupervised way through inductive biases in the archi-          whether it is possible to freeze the LLM and to just train the
                                       PaLM-E: An Embodied Multimodal Language Model
                                                                                             100%
input encoders, and if so, how different-modality encoders                                                  TAMP Success (Table 1)




                                                                  Success Rate or Accuracy
compare. In this case, the encoder has to produce embed-                                      75%
                                                                                                            Language-Table Success (Table 2)
                                                                                                            SayCan Affordances (Table 4)
ding vectors such that the frozen LLM is grounded on the
observations, and also propagate information to the LLM                                       50%

about the capabilities of an embodiment. Training such en-
                                                                                              25%
codings can be understood as a form of input-conditioned
soft-prompting (Tsimpoukelli et al., 2021), in relation to nor-                               0%
                                                                                                    TAMP Data Only     Lang. Table Data Only      SayCan Data Only            Full Mixture
mal soft prompts (Lester et al., 2021). In experiments with          PaLM-E
                                                                                                                                                                         (All robots + WebLI,
                                                                                                                                                                          VQA, COCO, etc.)
                                                                     Training
φOSRT , we also freeze the slot representation, i.e. we only           Data

update the small projector ψ which serves as the interface
between OSRT and the LLM.                                                                                       Different models for different robots,                One model for all robots
                                                                                                                        trained from scratch                         with ViT + PaLM pre-training

Co-training across tasks. In our experiments, we investi-
                                                                                             Figure 3: Overview of transfer learning demonstrated by PaLM-
gate the effects of co-training our models on a variety of                                   E: across three different robotics domains, using PaLM and ViT
diverse data. The “full mixture”, see App. A, consists pri-                                  pretraining together with the full mixture of robotics and general
marily of a diverse set of internet-scale vision-and-language                                visual-language data provides a significant performance increase
data, from a variety of tasks. The sampling frequencies are                                  compared to only training on the respective in-domain data. See
set such that only 8.9% of the full mixture is embodied data,                                Tab. 1, Fig. 4, Tab. 2, Tab. 4 for additional data in each domain.
and there are several tasks for each embodiment.
                                                                                             6.1. Robot Environments / Tasks
6. Experiments
                                                                                             Our three robot environments (Fig. 1) include a Task and
Our experiments consider diverse robotic (mobile) manip-                                     Motion Planning (TAMP) domain where a robot has to
ulation tasks across three different robot embodiments, in                                   manipulate (grasp and stack) objects, a table-top pushing
simulation and with two different real robots. We refer to                                   environment, and a mobile manipulation domain. In each
https://palm-e.github.io for videos showing the                                              domain, PaLM-E is trained on expert data from that do-
capabilities of PaLM-E on those tasks. Although not the                                      main. In many cases, this is a sparse amount of data per task.
focus of our work, we evaluate PaLM-E also on general                                        The TAMP tasks involve large combinatorics over possible
vision-language tasks such as visual-question-answering                                      plans, and many decision sequences are infeasible. PaLM-E
(VQA), image captioning, and established language model-                                     has to generate plans that consist of multiple steps, with
ing tasks.                                                                                   complicated decision boundaries. The multi-object tabletop
We split our experimental investigation into two broad cate-                                 pushing environment is taken from the publicly available
gories. First, we compare the different input representations                                Language-Table dataset (Lynch et al., 2022) and is chal-
from Sec. 4 with respect to performance, generalization, and                                 lenging since it includes several objects, large cardinality
data-efficiency. The second thread of experiments focuses                                    of language, and complex pushing dynamics. For both the
on one architecture, the main PaLM-E version, consisting                                     TAMP and Language-Table environment, PaLM-E has to
of a pre-trained ViT and PaLM language model that takes                                      reason about the poses of the objects. It is not sufficient to
in raw images as the continuous inputs. Here we show                                         know which objects are on the table or knowing their rough
that a single model, trained on a mixture of many datasets,                                  relationships, the more fine-grained details about the scene
across diverse tasks, and across robot embodiments, can                                      geometry are important for solving the tasks. Finally, we
simultaneously achieve high performance on all of those                                      consider a mobile manipulation domain similar to SayCan
tasks. Crucially, we investigate whether co-training on these                                (Ahn et al., 2022), where a robot has to solve a variety of
datasets enables transfer (Fig. 3): despite different tasks                                  tasks in a kitchen environment, including finding objects
and embodiments, the performance on the individual tasks                                     in drawers, picking them, and bringing them to a human.
increases by training on the mixture of tasks. We study                                      For all domains we consider both planning and VQA tasks
the influence on performance, generalization, and data ef-                                   in those environments. For the mobile manipulation and
ficiency with respect to co-training strategies and model                                    Language-Table environments, PaLM-E is integrated into
parameter size. Finally, we consider if freezing the LLM                                     the control loop to execute the plans in the real world, and
and just training the ViT that injects vision into the LLM is                                has to adjust the plan in presence of external disturbances
a viable path.                                                                               or failures of the low-level control policies.
As baselines, we consider the state-of-the art visual language                               6.2. TAMP Environment
model PaLI (Chen et al., 2022), which has not been trained
                                                                                             Tab. 7 (appendix) shows planning success rates and VQA
on embodiment robot data, as well as the SayCan algorithm
                                                                                             performance for the TAMP environment. The LLM is frozen
(Ahn et al., 2022), supplied with oracle affordances.
                                                                                             in these experiments (for pre-trained LLM). For the results
                                              PaLM-E: An Embodied Multimodal Language Model

reported in Tab. 7, the input representations are trained
                                                                                              LLM finetune (full mixture)                                    94.9%
on a dataset containing 96,000 training scenes of solely
the TAMP environment, i.e. no other data is part of the
                                                                                              LLM finetune (single robot)                  48.6%
mixture. For 3-5 objects in the scene, which is the same
number as in the training set, most input representations                                           without pretraining                  42.9%
perform similarly well. However, when increasing the 100%
                                                        num-




                                                                Success Rate or Accuracy
ber of objects, it turns out that using a pre-trained LLM                                     LLM frozen (full mixture)                             74.3%
improves performance considerably, especially with entity
                                                        75%

referrals. Furthermore, we show that a 62B LLM shows                                          LLM frozen (single robot)          31.8%
                                                        50%
better out-of-distribution generalization compared to the 8B
                                                                                                                            0%   20%        40%    60%      80%      100%
variant, while a non-pretrained LLM shows basically no25%out-
of-distribution generalization. The SayCan baseline (Ahn                                   Figure 4: Planning success results in the TAMP environment
et al., 2022) utilizes oracle affordance functions and has                                 (1% data) for PaLM-E-12B, comparing of the effects of PaLM-E
difficulties solving this environment, since affordance func-                              models (i) using the full training mixture, (ii) pre-training (ViT
tions only constrain what is possible right now, but are not                               and PaLM), and (iii) freezing or finetuning the language model.
                                                                                           Transfer from full mixture is particularly effective. Note that full
informative enough for the LLM to construct long-horizon
                                                                                           mixture contains only 1% of the training data (320 examples each)
plans in TAMP environments.                                                                for the tasks evaluated here. Shown is the mean of tasks p1 , p2 .
Tab. 1 shows results for 3-5 objects when training on 1%
of the dataset, which corresponds to only 320 TAMPexamples     for Lang. Table Data Only SayCan Data Only
                                                       Data Only                                                Full Mixture
each of the two planning tasks. Here we see that there are               Real Robot Results and (All robots  Few-Shot  + WebLI,Generalization. In
                                                                                                                                      PaLM-E Training Data
                                                                                                             VQA, COCO, etc.)
significant differences between the input representations, es-           Fig.   7,  a),  we  see PaLM-E     is capable       of guiding a real robot
pecially for the planning tasks. First, pre-training the LLM             through a multi-stage tabletop manipulation task, while
is beneficial in the low data regime for state inputs. Second,           remaining robust to adversarial disturbances. Given the ob-
both ViT variants (ViT+TL, ViT-4B) do not perform well                   served image and a long-horizon goal, e.g. “sort the blocks
in solving the planning tasks for this little data. However,             by colors into corners”, PaLM-E outputs language subgoals
if we co-train on all other robot environments as well as                at 1 Hz to the policies from Lynch et al. (2022), that output
general vision-language datasets (ViT-4B generalist), then               low-level robot actions at 5 Hz. Prior work (Lynch et al.,
the performance of the ViT-4B more than doubles. This                    2022) instead involved a human in the loop to interactively
shows a significant transfer effect between different robot              guide subgoals and corrections. In Fig. 5, b) we see PaLM-
embodiments and tasks. Finally, using OSRT as the input                  E is capable of one-shot and zero-shot learning. Here, we
representation leads to the best performance here, demon-                finetuned PaLM-E on 100 different long horizon tasks with
strating the strengths of 3D-aware object representations.               a single training example each, e.g. “put all the blocks in
We also observe another instance of transfer here: when                  the center”, “remove the blue blocks from the line”. We
we remove the TAMP VQA data and only train on the 640                    additionally see that PaLM-E can generalize zero-shot to
planning tasks examples, there is a (slight) drop in perfor-             tasks involving novel object pairs (Fig. 7, c) and to tasks in-
mance. The state-of-the art vision-language model PaLI                   volving      objects that were unseen in either the original robot
(Chen et al., 2022) that was not trained on robot data is                dataset     or  the finetuning datasets, e.g. a toy turtle (Fig. 5, d).
not able to solve the tasks. We only evaluated it on q2 (ob-
                                                                         6.4. Mobile Manipulation Environment
jects left/right/center on the table) and q3 (vertical object
relations), since those most resemble typical VQA tasks.                 We demonstrate the performance of PaLM-E on challenging
                                                                         and diverse mobile manipulation tasks. We largely follow
6.3. Language-Table Environment                                          the setup in Ahn et al. (2022), where the robot needs to plan
Tab. 2 reports success rates on long-horizon tasks from the              a sequence of navigation and manipulation actions based on
Language-Table environment (Lynch et al., 2022). PaLM-E                  an instruction by a human. For example, given the instruc-
is integrated into a control loop that takes as input the long-          tion “I spilled my drink, can you bring me something to
horizon task and the current image, and outputs an instruc-              clean it up?”, the robot needs to plan a sequence containing
tion for the low-level policy. We see that joint training on            “1.     Find a sponge, 2. Pick up the sponge, 3. Bring it to
internet-scale vision and language results in a more effec-              the   user,    4. Put down the sponge.” Inspired by these tasks,
tive model for robot planning, particularly in the few-shot              we    develop     3 use cases to test the embodied reasoning abil-
regime with only 10 demos per task. Scaling the 12B model                ities   of  PaLM-E:      affordance prediction, failure detection,
to the 84B model leads to improvements on 2 of 3 tasks. As               and    long-horizon      planning.   The low-level policies are from
with the TAMP environment, neither SayCan nor zero-shot                  RT-1     (Brohan     et al., 2022),  a transformer model that takes
PaLI are effective, unable to solve the easiest task tested.             RGB      image     and  natural  language       instruction, and outputs
                                                                         end-effector control commands.
                                                            PaLM-E: An Embodied Multimodal Language Model




Figure 5: A single PaLM-E model directs the low-level policies of two real robots. Shown is a long-horizon mobile manipulation task in
a kitchen, and one-shot / zero-shot generalization with a tabletop manipulation robot.


                              Object-          LLM           Embodied VQA       Planning    et al., 2022c). The multi-modal prompt is Given <img>.
                              centric         pre-train    q1   q2   q3   q4    p1 p2
                                                                                            Q: Was <skill> successful?. Tab. 4 shows that
 SayCan (oracle afford.) (Ahn et al., 2022)      3          -    -     -    -   38.7 33.3
 PaLI (zero-shot) (Chen et al., 2022)            3          -   0.0   0.0   -    -    -     PaLM-E outperforms PaLI (zero-shot), as well as a fine-
 PaLM-E (ours) w/ input enc:                                                                tuned version of CLIP on this dataset. PaLM-E also out-
   State                       3(GT)             7        99.4 89.8 90.3 88.3 45.0 46.1
   State                       3(GT)             3        100.0 96.3 95.1 93.1 55.9 49.7    performs the algorithm proposed in Xiao et al. (2022) that
   ViT + TL                    3(GT)             3        34.7 54.6 74.6 91.6 24.0 14.7     leverages two CLIP models trained with hindsight relabeled
   ViT-4B single robot            7              3          - 45.9 78.4 92.2 30.6 32.9
   ViT-4B full mixture            7              3          - 70.7 93.4 92.1 74.1 74.6      data. This method has access to more information than our
   OSRT (no VQA)                  3              3          -    -    -    - 71.9 75.1      method, and was specifically designed to just solve failure
   OSRT                           3              3        99.7 98.2 100.0 93.7 82.5 76.2
                                                                                            detection on this dataset.
Table 1: Comparison of different input representations on TAMP
environment (in terms of success rates), where data from TAMP                               Real robot results: Long-horizon planning. Finally, we
constitutes only 1% (i.e., 320 samples for p1 , p2 each) of total                           use PaLM-E to perform embodied planning end-to-end
training data size. PaLM-E outperforms both PaLI and SayCan                                 for mobile manipulation tasks. The prompt structure for
on embodied VQA and planning tasks. Cross-domain transfer                                   this task is Human: <instruction> Robot: <step
is observed, since the PaLM-E with ViT-4B trained on our full
data mixture improves planning performance. OSRT, despite using                             history>. I see <img>. PaLM-E is trained to gener-
no large-scale data, provides the most effective input encodings                            ate the next step of the plan, conditioned on the history of
for learning. (GT) means ground-truth object-centric information                            taken steps and the current image observation of the scene.
provided. In all experiments, the LLM is frozen. The non-object                             After each step is decoded, we map them to a low-level
centric ViT-4B variant utilizes color to reference objects, hence q1                        policy as defined in Ahn et al. (2022). This process is done
cannot be evaluated here. The LLM is frozen in these experiments
(except for the case where it is not pre-trained). Sec. B.1 describes                       in an autoregressive manner, until PaLM-E outputs “termi-
the tasks q1 -q4 , p1 , q2 .                                                                nate”. We train the model by using the runs from (Ahn et al.,
                                                                                            2022), which contains 2912 sequences. We qualitatively
                                                                                            evaluated the model in a real kitchen and found the model
Affordance prediction. We investigate PaLM-E’s perfor-                                      can carry out long-horizon mobile manipulation tasks, even
mance at affordance prediction, i.e. whether a skill of the                                 under adversarial disturbances (Fig. 5).
low-level policy can be executed in the current environment.
This can be formulated as the VQA problem Given <img>.                                      6.5. Performance on General Visual-Language Tasks
Q: Is it possible to <skill> here?.                PaLM-E
                                                                                            Although it is not the focus of our work, we report in Tab. 5
outperforms PaLI (zero-shot), as well as thresholding on
                                                                                            results on general vision-language tasks, including OK-
value functions trained with QT-OPT (Tab. 4).
                                                                                            VQA (Marino et al., 2019), VQA v2 (Goyal et al., 2017) and
Failure detection. For a robot to do closed-loop planning,                                  COCO captioning (Chen et al., 2015). A single, generalist
it is also important to detect failures, as is shown in (Huang
                                                     PaLM-E: An Embodied Multimodal Language Model

Zero-shot Baselines                                                  Task 1             Task 2                 Task 3            Task 1. Q: There is a block that is closest to
SayCan (oracle afford.) (Ahn et al., 2022)                             0.0                -                      -               {i.e., top right corner}. Push that block to
PaLI (Chen et al., 2022)                                               0.0                -                      -               the other block of the same color.
              trained        from LLM+ViT LLM         Task   # Demos                                                             Task 2. Q: How to sort the blocks by colors
PaLM-E-          on         scratch pretrain frozen finetune 10    20         40   10    20      40       10    20      80       into corners?
12B        Single robot       3         7      n/a       3      20.0 30.0 50.0 2.5 6.3 2.5 11.3 16.9 28.3
                                                                                                                                 Task 3. Q: How to push all the blocks that
12B        Full mixture       7         3      3         7       -    -   20.0  -    -   36.3  -    -   29.4
12B        Full mixture       7         3       7        7       -    -   80.0  -    -   57.5  -    -   50.0                     are on the {left/right} side together,
12B        Full mixture       7         3       7        3      70.0 80.0 80.0 31.3 58.8 58.8 57.5 54.4 56.3                     without bringing over any of the blocks
84B        Full mixture       7         3       7        7       -    -   90.0  -    -   53.8  -    -   64.4                     that are on the {right/left} side?

  Table 2: Results on planning tasks in the simulated environment from Lynch et al. (2022).                                      Table 3: Task prompts for Tab. 2.

   Baselines                                         Failure det.   Affordance                                   PaLM             PaLM-E            % drop (relative)
   PaLI (Zero-shot) (Chen et al., 2022)                 0.73           0.62                       60
   CLIP-FT (Xiao et al., 2022)                          0.65             -
   CLIP-FT-hindsight (Xiao et al., 2022)                0.89             -                                                                                             3.9%
   QT-OPT (Kalashnikov et al., 2018)                      -            0.63
   PaLM-E-12B       from     LLM+ViT LLM
   trained on     scratch     pretrain   frozen                                                   40

   Single robot         3           7        n/a        0.54           0.46                   NLG                                               61.6%
   Single robot         7           3        3          0.91           0.78                   Tasks
   Full mixture         7           3        3          0.91           0.87                   (avg)
   Full mixture         7           3         7         0.77           0.91                                              87.3%
                                                                                                  20

Table 4: Mobile manipulation environment: failure detection and
affordance prediction (F1 score).

                                                                                                      0
                                        VQAv2       OK-VQA   COCO
                                                                                                               8B       12B          62B      84B           540B     562B
 Model                            test-dev test-std    val Karpathy test
 Generalist (one model)
 PaLM-E-12B                         76.2       -      55.5    135.0
                                                                                        Figure 6: Results on general language tasks (NLG = natural
 PaLM-E-562B                        80.0       -      66.1    138.7                     language generation): increasing scale leads to less catastrophic
 Task-specific finetuned models                                                         forgetting between a corresponding PaLM-E model and its inher-
 Flamingo (Alayrac et al., 2022) 82.0        82.1    57.8†    138.1                     ited PaLM model. See full suite of tasks and results in Tab. 8.
 PaLI (Chen et al., 2022)           84.3     84.3     64.5    149.1
 PaLM-E-12B                         77.7     77.9     60.1    136.0
 PaLM-E-66B                           -        -      62.9      -
 PaLM-E-84B                         80.5       -      63.3    138.0                     E-12B) model 87.3% of its NLG performance (relative) has
 Generalist (one model), with frozen LLM                                                degraded during multimodal training, merely 3.9% have
 (Tsimpoukelli et al., 2021)        48.4       -        -       -                       been degraded for the largest model (PaLM-E-562B).
 PaLM-E-12B frozen                  70.3       -      51.5    128.0

Table 5: Results on general visual-language tasks. For the gen-                         7. Summary of Experiments & Discussion
eralist models, they are the same checkpoint across the different
evaluations, while task-specific finetuned models use different-                        Generalist vs specialist models – transfer. As summa-
finetuned models for the different tasks. COCO uses Karpathy                            rized in Fig. 3, we have shown several instances of transfer
splits. † is 32-shot on OK-VQA (not finetuned).                                         in this work, meaning that PaLM-E trained on different
                                                                                        tasks and datasets at the same time leads to significantly
PaLM-E-562B model achieves the highest reported number                                  increased performance relative to models trained separately
on OK-VQA, including outperforming models finetuned                                     on the different tasks alone. In Fig. 4, co-training on the
specifically on OK-VQA. Compared to (Tsimpoukelli et al.,                               “full mixture” achieves more than double the performance.
2021), PaLM-E achieves the highest performance on VQA                                   In Tab. 9, we see significant improvements in performance if
v2 with a frozen LLM to the best of our knowledge. This                                 we add LLM/ViT pre-training, and training on the full mix-
establishes that PaLM-E is a competitive visual-language                                ture instead of the mobile manipulation data alone. For the
generalist, in addition to being an embodied reasoner on                                Language-Table experiment in Tab. 2, we observe analogous
robotic tasks.                                                                          behaviour.
                                                                                        Data efficiency. Compared to available massive language
6.6. Performance on General Language Tasks                                              or vision-language datasets, robotics data is significantly
Tab. 8 reports the averaged performance of PaLM-E on 21                                 less abundant. As discussed in the last paragraph, our model
general language benchmarks for Natural Language Under-                                 exhibits transfer, which aids PaLM-E to solve robotics tasks
standing (NLU) and Natural Language Generation (NLG)                                    from very few training examples in the robotics domain, e.g.
tasks. The notable trend is that with increasing model scale,                           between 10 and 80 for Language Table or 320 for TAMP.
there is considerably less catastrophic forgetting of language                          The OSRT results show another instance of data-efficiency
capabilities. As seen in Fig. 6, while for the smallest (PaLM-                          by using a geometric input representation. A promising
                                       PaLM-E: An Embodied Multimodal Language Model

opportunity for future work is to combine this with a method      References
benefitting from large-scale visual data.
                                                                  Ahn, M., Brohan, A., Brown, N., Chebotar, Y., Cortes, O.,
Retaining language capabilities. We have shown two                  David, B., Finn, C., Gopalakrishnan, K., Hausman, K.,
paths to retain the language capabilities of the model during       Herzog, A., et al. Do as i can, not as i say: Ground-
multimodal training. As one option, freezing the LLM and            ing language in robotic affordances. arXiv preprint
only training the input encoders is a viable path for building      arXiv:2204.01691, 2022.
embodied language models, although this approach occa-
sionally struggled for robotics tasks (Tab. 2). As an alter-      Alayrac, J.-B., Donahue, J., Luc, P., Miech, A., Barr, I.,
native route, when the whole model is trained end-to-end,           Hasson, Y., Lenc, K., Mensch, A., Millican, K., Reynolds,
the model retains significantly more of its original language       M., et al. Flamingo: a visual language model for few-shot
performance with increasing model scale (Fig. 6).                   learning. arXiv preprint arXiv:2204.14198, 2022.
                                                                  Bommasani, R., Hudson, D. A., Adeli, E., Altman, R.,
8. Conclusion                                                       Arora, S., von Arx, S., Bernstein, M. S., Bohg, J., Bosse-
We proposed to build an embodied language model by in-              lut, A., Brunskill, E., et al. On the opportunities and risks
jecting multi-modal information such as images into the em-         of foundation models. arXiv preprint arXiv:2108.07258,
bedding space of a pre-trained LLM. Experiments showed              2021.
that off-the-shelf state-of-the-art vision-language models
                                                                  Brohan, A., Brown, N., Carbajal, J., Chebotar, Y., Dabis, J.,
trained on general VQA and captioning tasks are not suffi-
                                                                    Finn, C., Gopalakrishnan, K., Hausman, K., Herzog, A.,
cient for embodied reasoning tasks, as well as limitations of
                                                                    Hsu, J., et al. Rt-1: Robotics transformer for real-world
a recent proposal for grounding language models through
                                                                    control at scale. arXiv preprint arXiv:2212.06817, 2022.
affordances. To overcome these limitations, we proposed
PaLM-E, a single model that is able to control different          Brown, T., Mann, B., Ryder, N., Subbiah, M., Kaplan, J. D.,
robots in simulation and in the real world, while at the same       Dhariwal, P., Neelakantan, A., Shyam, P., Sastry, G.,
time being quantitatively competent at general VQA and              Askell, A., et al. Language models are few-shot learners.
captioning tasks. In particular the novel architectural idea of     Advances in neural information processing systems, 33:
ingesting neural scene representations (i.e., OSRT) into the        1877–1901, 2020.
model is particularly effective, even without large-scale data.
PaLM-E is trained on a mixture of diverse tasks across mul-       Changpinyo, S., Kukliansky, D., Szpektor, I., Chen, X.,
tiple robot embodiments as well as general vision-language          Ding, N., and Soricut, R. All you may need for vqa are
tasks. Importantly, we have demonstrated that this diverse          image captions, 2022. URL https://arxiv.org/
training leads to several avenues of transfer from the vision-      abs/2205.01883.
language domains into embodied decision making, enabling          Chen, M., Tworek, J., Jun, H., Yuan, Q., Pinto, H. P. d. O.,
robot planning tasks to be achieved data efficiently. While         Kaplan, J., Edwards, H., Burda, Y., Joseph, N., Brockman,
our results indicate that frozen language models are a viable       G., et al. Evaluating large language models trained on
path towards general-purpose embodied multimodal models             code. arXiv preprint arXiv:2107.03374, 2021a.
that fully retain their language capabilities, we have also
surfaced an alternative route with unfrozen models: scaling       Chen, T., Saxena, S., Li, L., Fleet, D. J., and Hinton, G.
up the language model size leads to significantly less catas-       Pix2seq: A language modeling framework for object
trophic forgetting while becoming an embodied agent. Our            detection. arXiv preprint arXiv:2109.10852, 2021b.
largest model, PaLM-E-562B, showcases emergent capabil-           Chen, X., Fang, H., Lin, T., Vedantam, R., Gupta, S., Dollár,
ities like multimodal chain of thought reasoning, and the           P., and Zitnick, C. L. Microsoft COCO captions: Data
ability to reason over multiple images, despite being trained       collection and evaluation server. CoRR, abs/1504.00325,
on only single-image prompts.                                       2015.

Acknowledgements                                                  Chen, X., Wang, X., Changpinyo, S., Piergiovanni, A.,
                                                                    Padlewski, P., Salz, D., Goodman, S., Grycner, A.,
The authors would like to thank, for their advice, help and         Mustafa, B., Beyer, L., et al. Pali: A jointly-scaled
support: Xi Chen, Etienne Pot, Sebastian Goodman, Maria             multilingual language-image model. arXiv preprint
Attarian, Ted Xiao, Keerthana Gopalakrishnan, Kehang Han,           arXiv:2209.06794, 2022.
Henryk Michalewski, Neil Houlsby, Basil Mustafa, Justin
                                                                  Chowdhery, A., Narang, S., Devlin, J., Bosma, M., Mishra,
Gilmer, Yonghui Wu, Erica Moreira, Victor Gomes, Tom
                                                                    G., Roberts, A., Barham, P., Chung, H. W., Sutton, C.,
Duerig, Henning Meyer, and Kendra Byrne.
                                                                    Gehrmann, S., et al. Palm: Scaling language modeling
                                                                    with pathways. arXiv preprint arXiv:2204.02311, 2022.
                                      PaLM-E: An Embodied Multimodal Language Model

Dehghani, M., Djolonga, J., Mustafa, B., Padlewski, P.,         Huang, W., Abbeel, P., Pathak, D., and Mordatch, I. Lan-
  Heek, J., Gilmer, J., Steiner, A., Caron, M., Geirhos, R.,      guage models as zero-shot planners: Extracting action-
  Alabdulmohsin, I., et al. Scaling vision transformers to        able knowledge for embodied agents. arXiv preprint
  22 billion parameters. arXiv preprint arXiv:2302.05442,         arXiv:2201.07207, 2022b.
  2023.
                                                                Huang, W., Xia, F., Xiao, T., Chan, H., Liang, J., Florence,
Devlin, J., Chang, M.-W., Lee, K., and Toutanova, K. Bert:        P., Zeng, A., Tompson, J., Mordatch, I., Chebotar, Y., et al.
  Pre-training of deep bidirectional transformers for lan-        Inner monologue: Embodied reasoning through planning
  guage understanding. arXiv preprint arXiv:1810.04805,          with language models. arXiv preprint arXiv:2207.05608,
  2018.                                                           2022c.
Dosovitskiy, A., Beyer, L., Kolesnikov, A., Weissenborn,        Jang, E., Irpan, A., Khansari, M., Kappler, D., Ebert, F.,
  D., Zhai, X., Unterthiner, T., Dehghani, M., Minderer, M.,      Lynch, C., Levine, S., and Finn, C. Bc-z: Zero-shot
  Heigold, G., Gelly, S., et al. An image is worth 16x16          task generalization with robotic imitation learning. In
 words: Transformers for image recognition at scale. arXiv        Conference on Robot Learning, pp. 991–1002. PMLR,
  preprint arXiv:2010.11929, 2020.                                2022.
Driess, D., Ha, J.-S., and Toussaint, M. Deep visual rea-       Jiang, Y., Gupta, A., Zhang, Z., Wang, G., Dou, Y., Chen, Y.,
  soning: Learning to predict action sequences for task and        Fei-Fei, L., Anandkumar, A., Zhu, Y., and Fan, L. Vima:
  motion planning from an initial scene image. In Proc. of         General robot manipulation with multimodal prompts.
  Robotics: Science and Systems (R:SS), 2020.                      arXiv preprint arXiv:2210.03094, 2022.
Gan, Z., Li, L., Li, C., Wang, L., Liu, Z., Gao, J., et al.     Kalashnikov, D., Irpan, A., Pastor, P., Ibarz, J., Herzog, A.,
  Vision-language pre-training: Basics, recent advances,          Jang, E., Quillen, D., Holly, E., Kalakrishnan, M., Van-
  and future trends. Foundations and Trends® in Computer          houcke, V., et al. Scalable deep reinforcement learning
  Graphics and Vision, 14(3–4):163–352, 2022.                     for vision-based robotic manipulation. In Conference on
Glaese, A., McAleese, N., Trebacz, M., Aslanides, J., Firoiu,     Robot Learning, pp. 651–673. PMLR, 2018.
  V., Ewalds, T., Rauh, M., Weidinger, L., Chadwick, M.,
                                                                Kojima, T., Gu, S. S., Reid, M., Matsuo, Y., and Iwasawa,
  Thacker, P., et al. Improving alignment of dialogue
                                                                 Y. Large language models are zero-shot reasoners. arXiv
  agents via targeted human judgements. arXiv preprint
                                                                  preprint arXiv:2205.11916, 2022.
  arXiv:2209.14375, 2022.

Goyal, Y., Khot, T., Summers-Stay, D., Batra, D., and           Lester, B., Al-Rfou, R., and Constant, N. The power of scale
  Parikh, D. Making the V in VQA matter: Elevating                for parameter-efficient prompt tuning. arXiv preprint
  the role of image understanding in Visual Question An-          arXiv:2104.08691, 2021.
  swering. In Conference on Computer Vision and Pattern
                                                                Lewkowycz, A., Andreassen, A., Dohan, D., Dyer, E.,
 Recognition (CVPR), 2017.
                                                                  Michalewski, H., Ramasesh, V., Slone, A., Anil, C.,
Guhur, P.-L., Chen, S., Garcia, R., Tapaswi, M., Laptev,          Schlag, I., Gutman-Solo, T., et al. Solving quantitative
  I., and Schmid, C. Instruction-driven history-aware             reasoning problems with language models. arXiv preprint
  policies for robotic manipulations. arXiv preprint              arXiv:2206.14858, 2022.
  arXiv:2209.04899, 2022.
                                                                Li, L. H., Yatskar, M., Yin, D., Hsieh, C.-J., and Chang,
Hao, Y., Song, H., Dong, L., Huang, S., Chi, Z., Wang, W.,        K.-W. Visualbert: A simple and performant baseline for
  Ma, S., and Wei, F. Language models are general-purpose         vision and language. arXiv preprint arXiv:1908.03557,
  interfaces. arXiv preprint arXiv:2206.06336, 2022.              2019.

Hu, X., Gan, Z., Wang, J., Yang, Z., Liu, Z., Lu, Y., and       Li, M., Lv, T., Chen, J., Cui, L., Lu, Y., Florencio, D., Zhang,
 Wang, L. Scaling up vision-language pre-training for              C., Li, Z., and Wei, F. Trocr: Transformer-based optical
  image captioning. In Proceedings of the IEEE/CVF Con-            character recognition with pre-trained models. arXiv
  ference on Computer Vision and Pattern Recognition, pp.          preprint arXiv:2109.10282, 2021.
 17980–17989, 2022.
                                                                Li, S., Puig, X., Du, Y., Wang, C., Akyurek, E., Torralba,
Huang, C., Mees, O., Zeng, A., and Burgard, W. Vi-                A., Andreas, J., and Mordatch, I. Pre-trained language
  sual language maps for robot navigation. arXiv preprint         models for interactive decision-making. arXiv preprint
  arXiv:2210.05714, 2022a.                                        arXiv:2202.01771, 2022.
                                      PaLM-E: An Embodied Multimodal Language Model

Liang, J., Huang, W., Xia, F., Xu, P., Hausman, K., Ichter,      Ryoo, M. S., Piergiovanni, A., Arnab, A., Dehghani, M., and
  B., Florence, P., and Zeng, A. Code as policies: Language        Angelova, A. Tokenlearner: What can 8 learned tokens do
  model programs for embodied control. arXiv preprint              for images and videos? arXiv preprint arXiv:2106.11297,
  arXiv:2209.07753, 2022.                                          2021.

Locatello, F., Weissenborn, D., Unterthiner, T., Mahendran,      Sajjadi, M. S. M., Duckworth, D., Mahendran, A., van
  A., Heigold, G., Uszkoreit, J., Dosovitskiy, A., and Kipf,       Steenkiste, S., Pavetić, F., Lučić, M., Guibas, L. J.,
  T. Object-centric learning with slot attention. Advances         Greff, K., and Kipf, T. Object Scene Representa-
  in Neural Information Processing Systems, 33:11525–              tion Transformer. NeurIPS, 2022a. URL https:
  11538, 2020.                                                     //osrt-paper.github.io/.

Lu, J., Batra, D., Parikh, D., and Lee, S. Vilbert: Pre-         Sajjadi, M. S. M., Meyer, H., Pot, E., Bergmann, U., Greff,
  training task-agnostic visiolinguistic representations for       K., Radwan, N., Vora, S., Lučić, M., Duckworth, D.,
  vision-and-language tasks. Advances in neural informa-           Dosovitskiy, A., et al. Scene representation transformer:
  tion processing systems, 32, 2019.                               Geometry-free novel view synthesis through set-latent
                                                                   scene representations. In Proceedings of the IEEE/CVF
Lu, K., Grover, A., Abbeel, P., and Mordatch, I. Pretrained        Conference on Computer Vision and Pattern Recognition,
  transformers as universal computation engines. arXiv             pp. 6229–6238, 2022b.
  preprint arXiv:2103.05247, 1, 2021.
                                                                 Shah, D., Osinski, B., Ichter, B., and Levine, S. Lm-
Lynch, C. and Sermanet, P. Language conditioned imi-               nav: Robotic navigation with large pre-trained mod-
  tation learning over unstructured data. arXiv preprint           els of language, vision, and action. arXiv preprint
  arXiv:2005.07648, 2020.                                          arXiv:2207.04429, 2022.
Lynch, C., Wahid, A., Tompson, J., Ding, T., Betker, J.,         Sharma, P., Ding, N., Goodman, S., and Soricut, R. Con-
  Baruch, R., Armstrong, T., and Florence, P. Interactive          ceptual captions: A cleaned, hypernymed, image alt-text
  language: Talking to robots in real time. arXiv preprint         dataset for automatic image captioning. In Proceedings
  arXiv:2210.06407, 2022.                                          of ACL, 2018.
Marino, K., Rastegari, M., Farhadi, A., and Mottaghi, R. Ok-     Sharma, P., Torralba, A., and Andreas, J. Skill induc-
 vqa: A visual question answering benchmark requiring              tion and planning with latent language. arXiv preprint
 external knowledge. In Conference on Computer Vision              arXiv:2110.01517, 2021.
 and Pattern Recognition (CVPR), 2019.
                                                                 Shridhar, M., Manuelli, L., and Fox, D. Cliport: What and
Nair, S., Mitchell, E., Chen, K., Savarese, S., Finn, C.,          where pathways for robotic manipulation. In Conference
  et al. Learning language-conditioned robot behavior from         on Robot Learning, pp. 894–906. PMLR, 2022a.
  offline data and crowd-sourced annotation. In Conference
  on Robot Learning, pp. 1303–1315. PMLR, 2022.                  Shridhar, M., Manuelli, L., and Fox, D. Perceiver-actor: A
                                                                   multi-task transformer for robotic manipulation. arXiv
Nottingham, K., Ammanabrolu, P., Suhr, A., Choi, Y., Ha-           preprint arXiv:2209.05451, 2022b.
  jishirzi, H., Singh, S., and Fox, R. Do embodied agents
  dream of pixelated sheep?: Embodied decision making            Silva, A., Moorman, N., Silva, W., Zaidi, Z., Gopalan, N.,
  using language guided world modelling. arXiv preprint             and Gombolay, M. Lancon-learn: Learning with language
  arXiv:2301.12050, 2023.                                           to enable generalization in multi-task manipulation. IEEE
                                                                   Robotics and Automation Letters, 7(2):1635–1642, 2021.
Piergiovanni, A., Kuo, W., and Angelova, A. Pre-training
  image-language transformers for open-vocabulary tasks,         Singh, I., Blukis, V., Mousavian, A., Goyal, A., Xu, D.,
  2022.    URL https://arxiv.org/abs/2209.                         Tremblay, J., Fox, D., Thomason, J., and Garg, A. Prog-
  04372.                                                           Prompt: Generating situated robot task plans using large
                                                                   language models. arXiv preprint arXiv:2209.11302,
Polu, S., Han, J. M., Zheng, K., Baksys, M., Babuschkin, I.,       2022.
  and Sutskever, I. Formal mathematics statement curricu-
  lum learning. arXiv preprint arXiv:2202.01344, 2022.           Tellex, S., Gopalan, N., Kress-Gazit, H., and Matuszek, C.
                                                                   Robots that use language. Annual Review of Control,
Reed, S., Zolna, K., Parisotto, E., Colmenarejo, S. G.,            Robotics, and Autonomous Systems, 3:25–55, 2020.
  Novikov, A., Barth-Maron, G., Gimenez, M., Sulsky,
  Y., Kay, J., Springenberg, J. T., et al. A generalist agent.   Thoppilan, R., De Freitas, D., Hall, J., Shazeer, N., Kul-
  arXiv preprint arXiv:2205.06175, 2022.                           shreshtha, A., Cheng, H.-T., Jin, A., Bos, T., Baker, L.,
                                      PaLM-E: An Embodied Multimodal Language Model

  Du, Y., et al. Lamda: Language models for dialog appli-
  cations. arXiv preprint arXiv:2201.08239, 2022.
Tsimpoukelli, M., Menick, J. L., Cabi, S., Eslami, S.,
  Vinyals, O., and Hill, F. Multimodal few-shot learn-
  ing with frozen language models. Advances in Neural
  Information Processing Systems, 34:200–212, 2021.

Wang, Z., Cai, S., Liu, A., Ma, X., and Liang, Y. Describe,
 explain, plan and select: Interactive planning with large
 language models enables open-world multi-task agents.
 arXiv preprint arXiv:2302.01560, 2023.
Wei, J., Wang, X., Schuurmans, D., Bosma, M., Chi, E.,
 Le, Q., and Zhou, D. Chain of thought prompting elic-
 its reasoning in large language models. arXiv preprint
 arXiv:2201.11903, 2022.
Xiao, T., Chan, H., Sermanet, P., Wahid, A., Brohan, A.,
  Hausman, K., Levine, S., and Tompson, J. Robotic
  skill acquisition via instruction augmentation with vision-
  language models. arXiv preprint arXiv:2211.11736,
  2022.
Zellers, R., Holtzman, A., Peters, M., Mottaghi, R., Kem-
  bhavi, A., Farhadi, A., and Choi, Y. Piglet: Language
  grounding through neuro-symbolic interaction in a 3d
  world. arXiv preprint arXiv:2106.00188, 2021a.
Zellers, R., Lu, X., Hessel, J., Yu, Y., Park, J. S., Cao, J.,
  Farhadi, A., and Choi, Y. Merlot: Multimodal neural
  script knowledge models. Advances in Neural Informa-
  tion Processing Systems, 34:23634–23651, 2021b.

Zeng, A., Wong, A., Welker, S., Choromanski, K., Tombari,
  F., Purohit, A., Ryoo, M., Sindhwani, V., Lee, J., Van-
  houcke, V., et al. Socratic models: Composing zero-
  shot multimodal reasoning with language. arXiv preprint
  arXiv:2204.00598, 2022.

Zhang, Y. and Chai, J. Hierarchical task learning from
  language instructions with unified transformers and self-
  monitoring. arXiv preprint arXiv:2106.03427, 2021.
Zhou, L., Palangi, H., Zhang, L., Hu, H., Corso, J., and Gao,
  J. Unified vision-language pre-training for image caption-
  ing and vqa. In Proceedings of the AAAI Conference on
  Artificial Intelligence, 2020.
                                        PaLM-E: An Embodied Multimodal Language Model




                                           …                                                              …




                                           …                                                              …




                                           …                                                              …




                                                                                  PaLM-E




Figure 7: PaLM-E interactively guides a real robot through long-horizon manipulation tasks on Language-Table, while remaining robust
to adversarial disturbances. We find evidence that PaLM-E is capable of one-shot and zero shot generalization.



A. Data Mixture
Tab. 6 shows the dataset and sampling frequency for the “full mixture” as referred to in the experiments. The majority of the
data distribution is general vision-language tasks, with less than 10% robot data.

B. Environment Details
B.1. Task and Motion Planning (TAMP)
The training scenes for the TAMP environment contain 3-5 cube-shaped objects of different sizes, colors and sampled initial
poses. Fig. 8 show an example test scene that contains 6 objects.
In the global version, we consider the following three VQA tasks:
                                        PaLM-E: An Embodied Multimodal Language Model

                  Dataset in full mixture                                            Sampling frequency          %
                  Webli (Chen et al., 2022)                                                            100     52.4
                  VQ2 A (Changpinyo et al., 2022)                                                       25     13.1
                  VQG (Changpinyo et al., 2022)                                                         10      5.2
                  CC3M (Sharma et al., 2018)                                                            25     13.1
                  Object Aware (Piergiovanni et al., 2022)                                              10      5.2
                  OKVQA (Marino et al., 2019)                                                            1      0.5
                  VQAv2 (Goyal et al., 2017)                                                             1      0.5
                  COCO (Chen et al., 2015)                                                               1      0.5
                  Wikipedia text                                                                         1      0.5
                  (robot) Mobile Manipulator, real                                                       6      3.1
                  (robot) Language Table (Lynch et al., 2022), sim and real                              8      4.2
                  (robot) TAMP, sim                                                                      3      1.6

                   Table 6: Dataset sampling frequency and ratio for the “full mixture” referred to in experiments.




    Figure 8: Two TAMP environment test examples. Left with 6 objects (training data contains 3-5 objects), right with 4 objects.


   • q2 : object-table relation. Example prompt: Given <img>. Q: Is the red object left, right,
     or center of the table?. Target: A: The red object is in the center of the table.

   • q3 : object-object relations. Example prompt: Given <img>. Q: Is the yellow object below the
     blue object?. Target: A: No, the yellow object is not below the blue object.

   • q4 : plan feasibility. Example prompt: Given <img>. Q: Is it possible to first grasp the
     blue object, then place it on the yellow object, and then grasp the yellow
     object?. Target: A: No, this is not possible.

as well as the two planning tasks

   • p1 : grasping. Example prompt: Given <img>. Q: How to grasp the green object?. Tar-
     get: A: First grasp the orange object and place it on the table, then grasp the
     green object.

   • p2 : stacking. Example prompt: Given <img>. Q: How to stack the white object on top
     of the red object?. Target: A: First grasp the green object and place it on the
     table, then grasp the white object and place it on the red object.

For the object-centric version with entity referrals, all prompts contain the prefix <prefix> = Obj 1 is <obj1 >. . . .
Obj j is <objj >., and the VQA task q1 is about the color of an object. The other tasks (except with the different
prefix, and entity referrals), remain the same.
We utilize the planner from Driess et al. (2020) to generate the dataset for the planning tasks. The low-level policies are also
obtained with the method of Driess et al. (2020).
                                         PaLM-E: An Embodied Multimodal Language Model

                                         φ                   LLM pre-trained       q1      q2      q3       q4      p1     p2
                         SayCan (w/ oracle affordances)            3               -       -        -       -      38.7   33.3
                                      state                        7             100.0    99.3     98.5    99.8    97.2   95.5
                                      state                    3(unfrozen)       100.0    98.8    100.0    97.6    97.7   95.3
                                      state                        3             100.0    98.4     99.7    98.5    97.6   96.0
         3-5               state (w/o entity referrals)            3             100.0    98.8     97.5    98.1    94.6   90.3
         objects             ViT + TL (obj. centric)               3              99.6    98.7     98.4    96.8     9.2   94.5
                               ViT + TL (global)                   3               -      60.7     90.8    94.3    70.7   69.2
                                 ViT-4B (global)                   3               -      98.2     99.4    99.0    96.0   93.4
                                ViT-4B generalist                  3               -      97.1    100.0    98.9    97.5   95.2
                                     OSRT                          3              99.6    99.1    100.0    98.8    98.1   95.7
                                       state                        7             20.4    39.2    71.4     85.2    56.5   34.3
         6
                                       state                        3            100.0    98.5    94.0     89.3    95.3   81.4
         objects
                            state (w/o entity referrals)            3             77.7    83.7    93.6     91.0    81.2   57.1
                                       state                        7             18.4    27.1    38.1     87.5    24.6    6.7
         8
                                       state                        3            100.0    98.3    95.3     89.8    91.3   89.3
         objects
                            state (w/o entity referrals)            3             60.0    67.1    94.1     81.2    49.3   49.3
                                  state (8B LLM)                    7              -       0       0       72.0     0      0
         6 objects +
                                  state (8B LLM)                    3              -      49.3    89.8     68.5    28.2   15.7
         OOD tasks
                                 state (62B LLM)                    3              -      48.7    92.5     88.1    40.0   30.0

Table 7: Success rates on TAMP environment for different input representations. 3-5 objects in the scene correspond to the training
distribution. OOD tasks means out-of-distribution tasks where the objects are referenced by color, although in the trainig data they have
been referenced by their special tokens objj in the object-centric case. The SayCan baseline (Ahn et al., 2022) utilizes oracle, one-step
affordance functions.


B.2. Interactive Language Table
We use the Language-Table real-world tabletop setup and simulated environment from Interactive Language (Lynch et al.,
2022).
Data collection. For each task, given the long horizon instruction, we prompt a labeler to enter a short horizon command
every 4 seconds. We pass the short horizon instructions to an Interactive Language policy trained using the same procedure
as in Lynch et al. (2022). The policy executes 40 steps (10Hz for 4 seconds) before requiring another command from the
labeler. This is repeated until the labeler determines the long horizon instruction is complete and issues a ’done’ instruction.
The data collection procedure for the real world experiments are the same as in simulation.
Train and Evaluation. To train the finetuned versions of these models, we train a pretrained PaLM-E model for 9,000
additional steps, in order to support a data complexity sweep without training several separate models from scratch on
slightly different versions of the full mixture. For Tasks 2 and 3 in simulation, we implement an automated reward to
measure the success rate, and we evaluate PaLM-E by running 80 rollouts for each task. Given the current image and high
level task, PaLM-E issues a text instruction which a trained low-level policy executes for 4 seconds before PaLM-E issues a
new text instruction. For Task 1, we use a test-set and report validation accuracy. This is because the task only requires one
step to solve, despite being a complicated visual and linguistic processing task and cannot be solved by the low-level policy
from the prompt alone.
                                            PaLM-E: An Embodied Multimodal Language Model

C. Natural Language Generation and Understanding Results

                                PaLM-8B    PaLM-E-12B      PaLM-62B    PaLM-E-84B      PaLM-540B    PaLM-E-562B        Category
      1-shot evals                            (unfrozen)                  (unfrozen)                   (unfrozen)
      TriviaQA (wiki) (EM)          48.5            10.1        72.7            31.8         81.4            74.6         NLG
      Natural Questions (EM)        10.6             1.6        23.1             7.6         29.3            27.2         NLG
      WebQuestions (EM)             12.6             3.4        19.8             7.9         22.6            21.8         NLG
      Lambada                       57.8             1.4        75.5            26.1         81.8            83.3         NLG
      HellaSwag                     68.2            48.4        79.7            75.3         83.6            83.5         NLU
      StoryCloze                    78.7            68.7        83.8            83.9         86.1            86.3         NLU
      Winograd                      82.4            71.8        85.3            86.4         87.5            89.0         NLU
      Winogrande                    68.3            55.3        76.8            72.5         83.7            83.0         NLU
      RACE-M                        57.7            43.2        64.1            57.4         69.3            70.3         NLU
      RACE-H                        41.6            33.2        48.7            42.3         52.1            52.8         NLU
      PIQA                          76.1            68.1        80.9            78.2         83.9            84.9         NLU
      ARC-e                         71.3            53.4        78.9            71.4         85.0            86.3         NLU
      ARC-c                         42.3            30.9        51.8            46.7         60.1            62.6         NLU
      OpenBookQA                    47.4            41.4        51.2            51.6         53.6            55.8         NLU
      BoolQ                         64.7            61.6        83.1            81.6         88.7            89.4         NLU
      Copa                          82.0            77.0        93.0            91.0         91.0            93.0         NLU
      RTE                           57.8            54.9        71.5            59.6         78.7            75.1         NLU
      Wic                           50.6            50.0        48.6            50.2         63.2            64.1         NLU
      WSC                           81.4            68.4        84.9            75.8         86.3            85.6         NLU
      ReCoRD                        87.8            71.2        91.0            78.5         92.8            92.5         NLU
      CB                            41.1            37.5        55.4            73.2         83.9            80.3         NLU

      Avg NLU                       64.7            55.0        72.3            69.2         78.2            78.5
      Avg NLG                       32.4             4.1        47.8            18.4         53.8            51.7

      NLU delta (%, relative)                    -15.0%                       -4.3%                        +0.4%
      NLG delta (%, relative)                    -87.3%                      -61.6%                        -3.8%


Table 8: Full language evaluation task results on both NLU and NLG tasks, for both the original PaLM models and for associated PaLM-E
(unfrozen) models. The PaLM-E models with a frozen LLM have the same performance as their corresponding underlying PaLM models.
                                        PaLM-E: An Embodied Multimodal Language Model

D. Additional Data for Affordance and Success Detection
                               Model                                              Precision   Recall   F1-score
                               PaLI (Zero-shot) (Chen et al., 2022)                 0.59       0.98      0.73
                               CLIP-FT (Xiao et al., 2022)                          0.50       0.95      0.65
                               CLIP-FT-hindsight (Xiao et al., 2022)                 1.0       0.80      0.89
                               PaLM-E-12B        from       LLM+ViT       LLM
                               trained on       scratch       pretrain   frozen
                               Single robot       3            7          n/a       0.52      0.55      0.54
                               Single robot       7            3          3         0.91      0.92      0.91
                               Full mixture       7            3          3         0.89      0.93      0.91
                               Full mixture       7            3           7        0.66      0.91      0.77

           Table 9: Mobile manipulation environment: failure detection, showing individual precision and recall scores.


                               Model                                              Precision   Recall   F1-score
                               PaLI (Zero-shot) (Chen et al., 2022)                 0.57       0.69      0.62
                               QT-OPT (Kalashnikov et al., 2018)                    0.60       0.67      0.63
                               PaLM-E-12B        from       LLM+ViT       LLM
                               trained on       scratch       pretrain   frozen
                               Single robot       3            7          n/a       0.67      0.35      0.46
                               Single robot       7            3          3         0.90      0.69      0.78
                               Full mixture       7            3          3         0.95      0.80      0.87
                               Full mixture       7            3           7        0.92      0.88      0.91

        Table 10: Mobile manipulation environment: affordance prediction, showing individual precision and recall scores.



E. Image Attribution
The image of the New York Knicks and Boston Celtics in Figure 2 is under the terms CC-by-2.0 (https://
creativecommons.org/licenses/by/2.0/), and was posted to Flickr by kowarski at https://www.flickr.
com/photos/27728232@N00/8666371367. The egocentric video images are from https://youtu.be/
-UXKmqBPk1w, as in (Zeng et al., 2022), via permission from creator Cody Wanner.
