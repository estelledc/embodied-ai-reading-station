## **Visual Instruction Tuning**

**Haotian Liu** [1] _[∗]_ **, Chunyuan Li** [2] _[∗]_ **, Qingyang Wu** [3] **, Yong Jae Lee** [1]

1University of Wisconsin–Madison 2Microsoft Research 3Columbia University
[https://llava-vl.github.io](https://llava-vl.github.io)


**Abstract**


Instruction tuning large language models (LLMs) using machine-generated
instruction-following data has been shown to improve zero-shot capabilities on
new tasks, but the idea is less explored in the multimodal field. We present the
first attempt to use language-only GPT-4 to generate multimodal language-image
instruction-following data. By instruction tuning on such generated data, we introduce LLaVA: **L** arge **L** anguage **a** nd **V** ision **A** ssistant, an end-to-end trained
large multimodal model that connects a vision encoder and an LLM for generalpurpose visual and language understanding. To facilitate future research on visual
instruction following, we construct two evaluation benchmarks with diverse and
challenging application-oriented tasks. Our experiments show that LLaVA demonstrates impressive multimodal chat abilities, sometimes exhibiting the behaviors
of multimodal GPT-4 on unseen images/instructions, and yields a 85.1% relative score compared with GPT-4 on a synthetic multimodal instruction-following
dataset. When fine-tuned on Science QA, the synergy of LLaVA and GPT-4
achieves a new state-of-the-art accuracy of 92.53%. We make GPT-4 generated
visual instruction tuning data, our model, and code publicly available.


**1** **Introduction**


Humans interact with the world through many channels such as vision and language, as each
individual channel has a unique advantage in representing and communicating certain concepts, and
thus facilitates a better understanding of the world. One of the core aspirations in artificial intelligence
is to develop a general-purpose assistant that can effectively follow multi-modal vision-and-language
instructions, aligned with human intent to complete various real-world tasks in the wild [4, 27, 26].


To this end, the community has witnessed an emergent interest in developing language-augmented
foundation vision models [27, 16], with strong capabilities in open-world visual understanding
such as classification [40, 21, 57, 54, 39], detection [29, 62, 33], segmentation [25, 63, 58] and
captioning [50, 28], as well as visual generation and editing [42, 43, 56, 15, 44, 30]. We refer readers
to the _Computer Vision in the Wild_ reading list for a more up-to-date literature compilation [12]. In
this line of work, each task is solved independently by one single large vision model, with the task
instruction implicitly considered in the model design. Further, language is only utilized to describe
the image content. While this allows language to play an important role in mapping visual signals to
language semantics—a common channel for human communication, it leads to models that usually
have a fixed interface with limited interactivity and adaptability to the user’s instructions.


Large language models (LLM), on the other hand, have shown that language can play a wider
role: a universal interface for a general-purpose assistant, where various task instructions can be
explicitly represented in language and guide the end-to-end trained neural assistant to switch to the
task of interest to solve it. For example, the recent success of ChatGPT [35] and GPT-4 [36] have
demonstrated the power of aligned LLMs in following human instructions, and have stimulated
tremendous interest in developing open-source LLMs. Among them, LLaMA [49] is an opensource LLM that matches the performance of GPT-3. Alpaca [48], Vicuna [9], GPT-4-LLM [38]


37th Conference on Neural Information Processing Systems (NeurIPS 2023).


utilize various machine-generated high-quality instruction-following samples to improve the LLM’s
alignment ability, reporting impressive performance compared with proprietary LLMs. Importantly,
this line of work is _text-only_ .


In this paper, we present _visual instruction-tuning_, the first attempt to extend instruction-tuning to
the language-image multimodal space, to pave the way towards building a general-purpose visual
assistant. In particular, our paper makes the following contributions:


  - _Multimodal instruction-following data_ . One key challenge is the lack of vision-language
instruction-following data. We present a data reformation perspective and pipeline to convert
image-text pairs into an appropriate instruction-following format, using ChatGPT/GPT-4.

  - _Large multimodal models_ . We develop a large multimodal model (LMM), by connecting the
open-set visual encoder of CLIP [40] with the language decoder Vicuna [9], and fine-tuning
end-to-end on our generated instructional vision-language data. Our empirical study validates
the effectiveness of using generated data for LMM instruction-tuning, and suggests practical
tips for building a general-purpose instruction-following visual agent. When ensembled with
GPT-4, our approach achieves SoTA on the Science QA [34] multimodal reasoning dataset.

  - _Multimodal instruction-following benchmark_ . We present LLaVA-Bench with two challenging
benchmarks, with a diverse selection of paired images, instructions and detailed annotations.

  - _Open-source_ . We release the following assets to the public: the generated multimodal instruction
data, the codebase, the model checkpoints, and a visual chat demo.


**2** **Related Work**


**Multimodal Instruction-following Agents.** In computer vision, existing works that build instructionfollowing agents can be broadly categorized into two classes: ( _i_ ) End-to-end trained models, which
are separately explored for each specific research topic. For example, the vision-language navigation
task [3, 19] and Habitat [47] require the embodied AI agent to follow natural language instructions
and take a sequence of actions to complete goals in visual environments. In the image editing domain,
given an input image and a written instruction that tells the agent what to do, InstructPix2Pix [6]
edits images by following the human instructions. ( _ii_ ) A system that coordinates various models
via LangChain [1] / LLMs [35], such as Visual ChatGPT [53], X-GPT [63], MM-REACT [55],
VisProg [18], and ViperGPT [46]. While sharing the same goal in building instruction-following
agents, we focus on developing an end-to-end trained language-vision multimodal model for _multiple_
tasks.


**Instruction Tuning.** In the natural language processing (NLP) community, to enable LLMs such
as GPT-3 [7], T5 [41], PaLM [10], and OPT [60] to follow natural language instructions and
complete real-world tasks, researchers have explored methods for LLM instruction-tuning [37, 52, 51],
leading to instruction-tuned counterparts such as InstructGPT [37]/ChatGPT [35], FLAN-T5 [11],
FLAN-PaLM [11], and OPT-IML [22], respectively. It turns out that this simple approach can
effectively improve the zero- and few-shot generalization abilities of LLMs. It is thus natural
to borrow the idea from NLP to computer vision. More broadly, the teacher-student distillation
ideas with foundation models have been studied in other topics such as image classification [14].
Flamingo [2] can be viewed as the GPT-3 moment in the multimodal domain, due to its strong
performance on zero-shot task transfer and in-context-learning. Other LMMs trained on imagetext pairs include BLIP-2 [28], FROMAGe [24], and KOSMOS-1 [20]. PaLM-E [13] is an LMM
for embodied AI. Based on the recent “best” open-source LLM LLaMA, OpenFlamingo [5] and
LLaMA-Adapter [59] are open-source efforts that enable LLaMA to use image inputs, paving the
way to build open-source multimodal LLMs. While these models present promising task transfer
generalization performance, they are not explicitly tuned with vision-language instruction data, and
their performance in multimodal tasks usually falls short compared to language-only tasks. In this
paper, we aim to fill this gap and study its effectiveness. Finally, note that visual instruction tuning
is different from visual prompt tuning [23]: the former aims to improve the model’s instructionfollowing abilities, while the latter aims to improve the parameter-efficiency in model adaptation.


**3** **GPT-assisted Visual Instruction Data Generation**


The community has witnessed a surge in the amount of public multimodal data such as image-text
pairs, ranging from CC [8] to LAION [45]. However, when it comes to multimodal instruction

2


![](images/img_023.jpg)

![](images/img_024.jpg)

Table 1: One example to illustrate the instruction-following data. The top block shows the contexts
such as captions and boxes used to prompt GPT, and the bottom block shows the three types of
responses. Note that the visual image is not used to prompt GPT, we only show it here as a reference.


following data, the available amount is limited, partially because the process for creating such data is
time-consuming and less well-defined when human crowd-scouring is considered. Inspired by the
success of recent GPT models in text-annotation tasks [17], we propose to leverage ChatGPT/GPT-4
for multimodal instruction-following data collection, based on the widely existing image-pair data.


For an image **X** `v` and its associated caption **X** `c`, it is natural to create a set of questions **X** `q` with the
intent to instruct the assistant to describe the image content. We prompt GPT-4 to curate such a list
of questions (see details in Appendix). Therefore, a simple way to expand an image-text pair to its
instruction-following version is `Human` : **X** `q` **X** `v<STOP> Assistant` : **X** `c<STOP>` . Though cheap to
construct, this simple expanded version lacks diversity and in-depth reasoning in both the instructions
and responses.


To mitigate this issue, we leverage language-only GPT-4 or ChatGPT as the strong teacher (both
accept only text as input), to create instruction-following data involving visual content. Specifically,
in order to encode an image into its visual features to prompt a text-only GPT, we use two types of
symbolic representations: ( _i_ ) _Captions_ typically describe the visual scene from various perspectives;
( _ii_ ) _Bounding boxes_ usually localize the objects in the scene, and each box encodes the object concept
and its spatial location. One example is shown in the top block of Table 14.


This symbolic representation allows us to encode the image as an LLM-recognizable sequence. We
use COCO images [31] and generate three types of instruction-following data. One example per type
is shown in the bottom block of Table 14. For each type, we first manually design a few examples.
They are the only human annotations we have during data collection, and are used as seed examples
in in-context-learning to query GPT-4.


  - _Conversation_ . We design a conversation between the assistant and a person asking questions
about this photo. The answers are in a tone as if the assistant is seeing the image and answering
the question. A diverse set of questions are asked about the visual content of the image, including
the object types, counting the objects, object actions, object locations, relative positions between
objects. Only questions that have definite answers are considered. Please see Appendix for the
detailed prompt.

  - _Detailed description_ . To include a rich and comprehensive description for an image, we create a
list of questions with such an intent. We prompt GPT-4 then curate the list (see detailed prompts


3


and curation process in Appendix). For each image, we randomly sample one question from the
list to ask GPT-4 to generate the detailed description.

  - _Complex reasoning_ . The above two types focus on the visual content itself, based on which
we further create in-depth reasoning questions. The answers typically require a step-by-step
reasoning process by following rigorous logic.


We collect 158K unique language-image instruction-following samples in total, including 58K in
conversations, 23K in detailed description, and 77k in complex reasoning, respectively. We ablated
the use of ChatGPT and GPT-4 in our early experiments, and found that GPT-4 consistently provides
higher quality instruction-following data, such as spatial reasoning.


**4** **Visual Instruction Tuning**


**4.1** **Architecture**


The primary goal is to effectively leverage the capabilities of both the pre-trained LLM and visual
model. The network archtecture is illustrated in Figure 1. We choose Vicuna [9] as our LLM _f_ _**ϕ**_ ( _·_ )
parameterized by _**ϕ**_, as it has the best instruction following capabilities in language tasks among
publicly available checkpoints [48, 9, 38].



![](images/img_031.jpg)





Figure 1: LLaVA network architecture.
For an input image **X** `v`, we consider the pre-trained CLIP visual encoder ViT-L/14 [40], which
provides the visual feature **Z** `v` = _g_ ( **X** `v` ). The grid features before and after the last Transformer layer
are considered in our experiments. We consider a simple linear layer to connect image features into
the word embedding space. Specifically, we apply a trainable projection matrix **W** to convert **Z** `v` into
language embedding tokens **H** `v`, which have the same dimensionality as the word embedding space
in the language model:
**H** `v` = **W** _·_ **Z** `v` _,_ with **Z** `v` = _g_ ( **X** `v` ) (1)
Thus, we have a sequence of visual tokens **H** `v` . Note that our simple projection scheme is lightweight,
which allows us to iterate data centric experiments quickly. More sophisticated schemes to connect the image and language representations can also be considered, such as gated cross-attention
in Flamingo [2] and Q-former in BLIP-2 [28]. We leave exploring possibly more effective and
sophisticated architecture designs for LLaVA as future work.


**4.2** **Training**


For each image **X** `v`, we generate multi-turn conversation data ( **X** [1] `q` _[,]_ **[ X]** [1] `a` _[,][ · · ·][,]_ **[ X]** _[T]_ `q` _[,]_ **[ X]** `a` _[T]_ [)][, where] _[ T]_ [ is]
the total number of turns. We organize them as a sequence, by treating all answers as the assistant’s
response, and the instruction **X** _[t]_ `instruct` [at the] _[ t]_ [-th turn as:]

      - Randomly choose [ **X** [1] `q` _[,]_ **[ X]** `[v]` []][ or][ [] **[X]** `[v]` _[,]_ **[ X]** [1] `q` []] _[,]_ the first turn _t_ = 1
**X** _[t]_ `instruct` [=] (2)
**X** _[t]_ `q` _[,]_ the remaining turns _t >_ 1


This leads to the unified format for the multimodal instruction-following sequence illustrated in
Table 2. We perform instruction-tuning of the LLM on the prediction tokens, using its original
auto-regressive training objective.


Specifically, for a sequence of length _L_, we compute the probability of the target answers **X** `a` by:



_p_ ( **X** `a` _|_ **X** `v` _,_ **X** `instruct` ) =



_L_

- _p_ _**θ**_ ( _**x**_ _i|_ **X** `v` _,_ **X** `instruct` _,<i,_ **X** `a` _,<i_ ) _,_ (3)

_i_ =1


4


![](images/img_032.jpg)

Table 2: The input sequence used to train the model. Only two conversation turns are illustrated
here; in practice, the number of turns varies based on the instruction-following data. In our current
implementation, we follow Vicuna-v0 [9] to set the system message **X** `system-message` and we set
`<STOP>` = `###` . The model is trained to predict the assistant answers and where to stop, and thus
only green sequence/tokens are used to compute the loss in the auto-regressive model.


where _**θ**_ is the trainable parameters, **X** `instruct` _,<i_ and **X** `a` _,<i_ are the instruction and answer tokens in
all turns before the current prediction token _**x**_ _i_, respectively. Please see Table 2 for an illustration of
the prediction tokens. For the conditionals in (3), we explicitly add **X** `v` to emphasize the fact that the
image is grounded for all answers, and we omit **X** `system-message` and all previous `<STOP>` for better
readability. For LLaVA model training, we consider a two-stage instruction-tuning procedure.


**Stage 1: Pre-training for Feature Alignment.** To strike a balance between concept coverage
and training efficiency, we filter CC3M to 595K image-text pairs. Please see Appendix for details
of the filtering process. These pairs are converted to the instruction-following data using the naive
expansion method describe in Section 3. Each sample can be treated as a single-turn conversation. To
construct the input **X** `instruct` in (2), for an image **X** `v`, a question **X** `q` is randomly sampled, which is a
language instruction to request the assistant to describe the image briefly. The ground-truth prediction
answer **X** `a` is the original caption. In training, we keep both the visual encoder and LLM weights
frozen, and maximize the likelihood of (3) with trainable parameters _**θ**_ = **W** (the projection matrix)
only. In this way, the image features **H** `v` can be aligned with the pre-trained LLM word embedding.
This stage can be understood as training a compatible visual tokenizer for the frozen LLM.


**Stage 2: Fine-tuning End-to-End.** We always keep the visual encoder weights frozen, and continue
to update both the pre-trained weights of the projection layer and LLM in LLaVA; i.e., the trainable
parameters are _**θ**_ = _{_ **W** _,_ _**ϕ**_ _}_ in (3). We consider two specific use case scenarios:


  - _Multimodal Chatbot_ . We develop a Chatbot by fine-tuning on the 158K language-image
instruction-following data in Section 3. Among the three types of responses, conversation is
multi-turn while the other two are single-turn. They are uniformly sampled in training.

  - _Science QA_ . We study our method on the ScienceQA benchmark [34], the first large-scale
multimodal science question dataset that annotates the answers with detailed lectures and
explanations. Each question is provided a context in the form of natural language or an image.
The assistant provides the reasoning process in natural language and selects the answer among
multiple choices. For training in (2), we organize the data as a single turn conversation, the
question & context as **X** `instruct`, and reasoning & answer as **X** `a` .


**5** **Experiments**


We assess the performance of LLaVA in instruction-following and visual reasoning capabilities with
two primary experimental settings: multimodal chatbot and the ScienceQA dataset, respectively. We
train all models with 8 _×_ A100s, following Vicuna’s hyperparameters [9]. We pre-train our model
on the filtered CC-595K subset for 1 epoch with a learning rate of 2e-3 and a batch size of 128, and
fine-tune on the proposed LLaVA-Instruct-158K dataset for 3 epochs, with a learning rate of 2e-5 and
a batch size of 32. See Appendix for more training details.


**5.1** **Multimodal Chatbot**


We developed a chatbot demo to show the image understanding and conversation abilities of LLaVA,
and to study how well LLaVA is able to digest visual inputs and exhibit instruction-following
capabilities. We first use the examples in the original GPT-4 paper [36], shown in Table 3 (more
examples in Appendix), that require in-depth image understanding. For comparisons, we quote the
prompt and response of the multimodal GPT-4 from their paper, and query BLIP-2 and OpenFlamingo
model checkpoints to get their response.


5


**Visual input example, Extreme Ironing:**


Source: `[https://www.barnorama.com/wp-content/uploads/2016/12/03-Confusing-Pictures.jpg](https://www.barnorama.com/wp-content/uploads/2016/12/03-Confusing-Pictures.jpg)`
User What is unusual about this image?
LLaVA The unusual aspect of this image is a man ironing clothes on the back of a minivan or
van. This is not a typical place to perform this activity, as one would usually iron clothes
in a more stationary and safe location, such as a home, using a regular ironing board.
The scene depicted in the image is peculiar as it involves a makeshift ironing setup on a
vehicle, which can be both unsafe and unconventional. Additionally, it is not clear how
the man is able to maintain balance and stability while ironing clothes in such an unstable
environment.

[ _Start a new conversation, and clear the history_ ]
User What’s happening in the scene?
LLaVA The image depicts a man standing on top of a yellow SUV in a busy city street. He is
holding a portable ladder, seemingly ironing clothes while standing on the vehicle. Around
the scene, there are other cars, a traffic light, and a fire hydrant. Additionally, there are
two other people in the vicinity, one close to the man on the car and another further away.
The man on the ladder appears to be attracting attention due to his unconventional choice
of ironing his clothes on top of a moving car. The city street around him is bustling with
activity, adding to the unique nature of the scene.


User What is unusual about this image?
GPT-4 [36] The unusual thing about this image is that a man is ironing clothes on an ironing board
attached to the roof of a moving taxi.


User What is unusual about this image?
BLIP-2 a man is sitting on the back of a yellow cab


User What is unusual about this image?
OpenFlamingo The man is drying his clothes on the hood of his car.


Table 3: Example prompt from GPT-4 paper [36] to compare visual reasoning and chat capabilities.
Compared to BLIP-2 [28] and OpenFlamingo [5], LLaVA accurately follows the user’s instructions,
instead of simply describing the scene. LLaVA offers a more comprehensive response than GPT-4.
Even when merely asked to describe the image, LLaVA identifies atypical aspects of the image.


Surprisingly, although LLaVA is trained with a small multimodal instruction-following dataset
( _∼_ 80K unique images), it demonstrates quite similar reasoning results with multimodal GPT-4 on
these examples. Note that while these images are out-of-domain for LLaVA, LLaVA is still able
to understand the scenes and follow the question instruction to provide a reasonable response. In
contrast, BLIP-2 and OpenFlamingo focus on describing the image, instead of following the user
instruction to answer in an appropriate manner.


**Quantitative Evaluation.** To gain a systematic understanding of the performance of LLaVA, we
propose a quantitative metric to measure the model’s instruction-following capability on multimodal
data. Inspired by [9], we leverage GPT-4 to measure the quality of generated responses. Specifically,
we create triplets consisting of image, ground-truth textual descriptions, and question. The candidate
models ( _e.g.,_ LLaVA) predict the answers based on the question and the image. To provide an
_approximate theoretical upper bound_, we create a reference prediction based on the question and
the _ground-truth_ textual descriptions, using the text-only GPT-4. After obtaining the responses from
both models, we feed the question, visual information (in the format of textual descriptions), and
the generated responses from both assistants, to the judge ( _i.e.,_ text-only GPT-4). It evaluates the
helpfulness, relevance, accuracy, and level of detail of the responses from the assistants, and gives an
overall score on a scale of 1 to 10, where a higher score indicates better overall performance. It is
also asked to provide a comprehensive explanation for the evaluation, for us to better understand the


6



![](images/img_033.jpg)
|Col1|Conversation Detail description Complex reasoning All|
|---|---|
|Full data<br>Detail + Complex<br>Conv + 5% Detail + 10% Complex<br>Conversation<br>No Instruction Tuning|83.1<br>75.3<br>96.5<br>85.1<br>81.5 (-1.6)<br>73.3 (-2.0)<br>90.8 (-5.7)<br>81.9 (-3.2)<br>81.0 (-2.1)<br>68.4 (-7.1)<br>91.5 (-5.0)<br>80.5 (-4.4)<br>76.5 (-6.6)<br>59.8 (-16.2)<br>84.9 (-12.4)<br>73.8 (-11.3)<br>22.0 (-61.1)<br>24.0 (-51.3)<br>18.5 (-78.0)<br>21.5 (-63.6)|



Table 4: Ablation on LLaVA-Bench (COCO) with different training data. We report relative scores
_w.r.t._ a text-only GPT-4 model that uses ground truth image captions and bounding boxes as visual
input. We prompt GPT-4 with the answers from our model outputs and the answers by GPT-4
(text-only), and let it compare between both responses and give a rating with an explanation.

|Col1|Conversation Detail description Complex reasoning All|
|---|---|
|OpenFlamingo [5]<br>BLIP-2 [28]<br>LLaVA<br>LLaVA_†_|19.3_ ±_ 0.5<br>19.0_ ±_ 0.5<br>19.1_ ±_ 0.7<br>19.1_ ±_ 0.4<br>54.6_ ±_ 1.4<br>29.1_ ±_ 1.2<br>32.9_ ±_ 0.7<br>38.1_ ±_ 1.0<br>57.3_ ±_ 1.9<br>52.5_ ±_ 6.3<br>81.7_ ±_ 1.8<br>67.3_ ±_ 2.0<br>58.8_ ±_ 0.6<br>49.2_ ±_ 0.8<br>81.4_ ±_ 0.3<br>66.7_ ±_ 0.3|



Table 5: Instruction-following capability comparison using relative scores on LLaVA-Bench (In-theWild). The results are reported in the format of _mean ± std_ . For the first three rows, we report three
inference runs. LLaVA performs significantly better than others. _[†]_ For a given set of LLaVA decoding
sequences, we evaluate by querying GPT-4 three times; GPT-4 gives a consistent evaluation.


models. We report relative scores _w.r.t._ the text-only GPT-4 model that uses the textural ground truth
description as visual input. We create two benchmarks to evaluate the model’s performance.


**LLaVA-Bench (COCO).** We randomly select 30 images from COCO-Val-2014, and for each
image, we generate three types of questions (conversation, detailed description, complex reasoning)
using the proposed data generation pipeline in Sec. 3, totaling 90 questions. This benchmark studies
the model’s alignment behavior and capabilities with consistent visual inputs. We vary the training
datasets to study the effectiveness of different types of instruction-following data, and show the results
in Table 4. First, with instruction tuning, the model’s ability of following user instructions improves
significantly by over 50 points. Second, adding a small amount of detailed description and complex
reasoning questions contributes to a considerable improvement of the model’s overall capability
by 7 points. Furthermore, it also improves the model’s performance on conversational questions,
suggesting that improvements in reasoning capabilities complement conversational abilities. Finally,
we show that having all three types of data yields the best performance at 85.1%.


**LLaVA-Bench (In-the-Wild).** To evaluate the model’s capability in more challenging tasks and
generalizability to novel domains, we collect a diverse set of 24 images with 60 questions in total,
including indoor and outdoor scenes, memes, paintings, sketches, _etc._, and associate each image
with a highly-detailed and manually-curated description and a proper selection of questions. We
compare LLaVA, BLIP, and OpenFlamingo in Table 5. Thanks to visual instruction tuning, LLaVA
achieves significantly better performance compared with BLIP-2 (+29%) and OpenFlamingo (+48%).
Compared to the text-only GPT-4 that has access to ground-truth labels, LLaVA achieves an impressive
81.7% performance on complex reasoning questions, with an overall score of 67.3%.


**Limitations.** This LLaVA-Bench (In-the-Wild) is designed to be challenging and to reveal a model’s
weaknesses. We provide two examples with associated captions and questions in Table 6. For the
ramen example (left), to correctly answer the name of the restaurant, it requires the model to have
a large knowledge coverage and multilingual understanding capability; to correctly describe the
side dishes, the model may need to retrieve relevant multimodal information from Internet. For the
fridge example (right), perceiving the correct brand of the yogurt requires the model to process high
resolution images and possess extensive knowledge coverage. We also observed an interesting failure
of LLaVA, as it responds with _yes_ when asked if strawberry-flavored yogurt is present, even though
the fridge contains only yogurt _and_ strawberries. This indicates that, at times, LLaVA perceives
the image as a “bag of patches”, failing to grasp the complex semantics within the image. We hope
LLaVA serves as a solid baseline on the benchmarks, on which our findings can inspire future work
in developing more capable LMMs.


7


**Challenging examples from LLaVA-Bench (In-the-Wild):**


[ICHIRAN Ramen [source]](https://media-cdn.tripadvisor.com/media/photo-p/12/67/49/e2/photo7jpg.jpg) [Filled fridge [source]](https://static01.nyt.com/images/2020/01/23/smarter-living/23help/00wc-fridge-superJumbo.jpg?quality=75&auto=webp)



![](images/img_034.jpg)

Annotation A close-up photo of a meal at ICHIRAN. The chashu ramen bowl with
a spoon is placed in the center. The
ramen is seasoned with chili sauce,
chopped scallions, and served with
two pieces of chashu. Chopsticks are
placed to the right of the bowl, still in
their paper wrap, not yet opened. The
ramen is also served with nori on the
left. On top, from left to right, the following sides are served: a bowl of orange spice (possibly garlic sauce), a
plate of smoke-flavored stewed pork
with chopped scallions, and a cup of
matcha green tea.



![](images/img_035.jpg)

An open refrigerator filled with a variety of food
items. In the left part of the compartment, towards
the front, there is a plastic box of strawberries with a
small bag of baby carrots on top. Towards the back,
there is a stack of sauce containers. In the middle
part of the compartment, towards the front, there
is a green plastic box, and there is an unidentified
plastic bag placed on it. Towards the back, there is a
carton of milk. In the right part of the compartment,
towards the front, there is a box of blueberries with
three yogurts stacked on top. The large bottle of
yogurt is Fage non-fat yogurt, and one of the smaller
cups is Fage blueberry yogurt. The brand and flavor
of the other smaller cup are unknown. Towards the
back, there is a container with an unknown content.



Question 1 What’s the name of the restaurant? What is the brand of the blueberry-flavored yogurt?


Question 2 Describe this photo in detail. Is there strawberry-flavored yogurt in the fridge?


Table 6: Challenging examples from LLaVA-Bench (In-the-Wild), we provide extremely-detailed
annotation for each image for an accurate evaluation. Some questions require the model to extract
details from high resolution image and to have a broad knowledge coverage.


**5.2** **ScienceQA**


ScienceQA [34] contains 21k multimodal multiple choice questions with rich domain diversity across
3 subjects, 26 topics, 127 categories, and 379 skills. The benchmark dataset is split into training,
validation, and test splits with 12726, 4241, and 4241 examples, respectively. We consider two
representative methods, including GPT-3.5 model ( `text-davinci-002` ) with and without chainof-thought (CoT), LLaMA-Adapter [59], as well as multimodal chain-of-thought (MM-CoT) [61],
which is the current SoTA method on this dataset. For more baseline numbers, please see [34].


The results are reported in Table 7. For LLaVA, we use the visual features before the last layer, ask
the model to first predict reasons and then the answer, and train it for 12 epochs. It yields 90.92%
accuracy, which is quite close to the SoTA 91.68%. To explore the limit of LLMs, we also prompt
GPT-4 using 2-shot in-context-learning and achieve 82.69% accuracy, which is a 7.52% absolute gain
compared with 75.17% from GPT-3.5. For a substantial number of questions, we note that GPT-4 fails
simply because it reports that there is insufficient context such as images or plots. We consider two
schemes to combine the outcomes from our model and GPT-4. ( _i_ ) _A GPT-4 complement_ . Whenever
GPT-4 fails to provide answers, we use the prediction from our method. This schemes yields 90.97%
accuracy, which is almost the same as applying our method alone. ( _ii_ ) _GPT-4 as the judge_ . Whenever
GPT-4 and LLaVA produce different answers, we prompt GPT-4 again, asking it to provide its own
final answer based on the question and two outcomes. The spirit is similar with CoT, but with the
external knowledge from the other model. Surprisingly, this scheme is able to provide consistent
improvement over all question classes, and achieves a new SoTA accuracy of 92.53%. Interestingly,
the text-only GPT-4, which cannot process images, improves the overall performance of the model
on questions that have an image as context. This is because some of these questions do not actually
require the image context for a correct answer. The GPT-4 judge can identify such cases and correct
some of the errors that LLaVA makes. See the example in Appendix. To the best of our knowledge,


8


Subject Context Modality Grade
Method Average
NAT SOC LAN TXT IMG NO G1-6 G7-12


_Representative & SoTA methods with numbers reported in the literature_
Human [34] 90.23 84.97 87.48 89.60 87.50 88.10 91.59 82.42 88.40
GPT-3.5 [34] 74.64 69.74 76.00 74.44 67.28 77.42 76.80 68.89 73.97
GPT-3.5 w/ CoT [34] 75.44 70.87 78.09 74.68 67.43 79.93 78.23 69.68 75.17
LLaMA-Adapter [59] 84.37 88.30 84.36 83.72 80.32 86.90 85.83 84.05 85.19
MM-CoT _Base_ [61] 87.52 77.17 85.82 87.88 82.90 86.83 84.65 85.37 84.91
MM-CoT _Large_ [61] 95.91 82.00 90.82 95.26 88.80 92.89 92.44 90.31 91.68


_Results with our own experiment runs_


Table 7: Accuracy (%) on Science QA dataset. Question categories: NAT = natural science, SOC =
social science, LAN = language science, TXT = text context, IMG = image context, NO = no context,
G1-6 = grades 1-6, G7-12 = grades 7-12. _[†]_ Text-only GPT-4, our eval. Our novel model ensembling
with the text-only GPT-4 consistently improves the model’s performance under all categories, setting
the new SoTA performance.


this is the first time that GPT-4 is used for model ensembling. We hope this finding can encourage
future research to explore more effective methods to leverage LLMs for model ensembling.


**Ablations.** We ablate several design choices
on ScienceQA in Table 8. ( _i_ ) _Visual features_ .

vision encoder, which yields 89.96% and is

layer. We hypothesize that this is because
CLIP’s last layer features may focus more on

|Visual features|Before Last|
|---|---|
|Best variant<br>Predict answer frst<br>Training from scratch<br>7B model size|90.92<br>89.96 (-0.96)<br>-<br>89.77 (-1.15)<br>85.81 (-5.11)<br>-<br>89.84 (-1.08)<br>-|


Table 8: Design choice ablations (%). The differ
global and abstract image properties compared

ence with the best variant is reported in red text.

to the layer before it, which can focus more on
localized properties that are useful for understanding specific image details. ( _ii_ ) _Chain-of-thought_ . To decide the order between the answer
and reasoning process in the model prediction, we run both variants and observe that answer-first
reports the best number 89.77% accuracy in 12 epochs, while reasoning-first can quickly reach
89.77% accuracy in 6 epochs, but no further improvement with more training. Training the model
for 24 epochs does not improve the performance. We conclude that CoT-like reasoning-first strategy
can largely improve convergence, but contributes relatively little to the final performance. ( _iii_ )
_Pre-training_ . We skip pre-training and directly train on Science QA from scratch – performance drops
to 85.81% accuracy. The 5.11% absolute degradation indicates the importance of our pre-training
stage, in aligning multimodal features while preserving the vast pre-trained knowledge. ( _iv_ ) _Model_
_size_ . We keep all configurations the same as our best 13B model, and train a 7B model. This yields
89.84% accuracy, which is 1.08% lower than 90.92%, demonstrating the importance of model scale.


**6** **Conclusion**


This paper demonstrated the effectiveness of visual instruction tuning. We presented an automatic
pipeline to create language-image instruction-following data, based on which we train LLaVA, a
multimodal model to follow human intent to complete visual tasks. It achieves the new SoTA
accuracy when fine-tuned on ScienceQA, and excellent visual chat capabilities when fine-tuned
on multimodal chat data. Besides, we present the first benchmark to study multimodal instructionfollowing capability. This paper is an initial step in visual instruction tuning, and mainly focuses on
real-life tasks. For more quantitative results of LLaVA on academic benchmarks, please refer to the
improved baselines with visual instruction tuning [32]. We hope our work can inspire future research
on building more capable multimodal models.


**Acknowledgements.** We thank Baolin Peng and Pan Lu for valuable discussions on instruction-tuning
language models and Science QA, respectively. We thank the LLaMA team for giving us access


9



![](images/img_036.jpg)
to their models, and open-source projects, including Alpaca and Vicuna. This work was supported
in part by NSF CAREER IIS2150012, and Institute of Information & communications Technology
Planning & Evaluation(IITP) grants funded by the Korea government(MSIT) (No. 2022-0-00871,
Development of AI Autonomy and Knowledge Enhancement for AI Agent Collaboration) and
(No. RS-2022-00187238, Development of Large Korean Language Model Technology for Efficient
Pre-training).


**References**


[1] Langchain. `[https://github.com/hwchase17/langchain](https://github.com/hwchase17/langchain)`, 2022. 2


[2] Jean-Baptiste Alayrac, Jeff Donahue, Pauline Luc, Antoine Miech, Iain Barr, Yana Hasson,
Karel Lenc, Arthur Mensch, Katie Millican, Malcolm Reynolds, et al. Flamingo: a visual
language model for few-shot learning. _arXiv preprint arXiv:2204.14198_, 2022. 2, 4


[3] Peter Anderson, Qi Wu, Damien Teney, Jake Bruce, Mark Johnson, Niko Sünderhauf, Ian Reid,
Stephen Gould, and Anton Van Den Hengel. Vision-and-language navigation: Interpreting
visually-grounded navigation instructions in real environments. In _Proceedings of the IEEE_
_conference on computer vision and pattern recognition_, 2018. 2


[4] Amanda Askell, Yuntao Bai, Anna Chen, Dawn Drain, Deep Ganguli, Tom Henighan, Andy
Jones, Nicholas Joseph, Ben Mann, Nova DasSarma, et al. A general language assistant as a
laboratory for alignment. _arXiv preprint arXiv:2112.00861_, 2021. 1


[5] Anas Awadalla, Irena Gao, Joshua Gardner, Jack Hessel, Yusuf Hanafy, Wanrong Zhu, Kalyani
Marathe, Yonatan Bitton, Samir Gadre, Jenia Jitsev, Simon Kornblith, Pang Wei Koh, Gabriel
Ilharco, Mitchell Wortsman, and Ludwig Schmidt. Openflamingo, March 2023. 2, 6, 7


[6] Tim Brooks, Aleksander Holynski, and Alexei A Efros. Instruct pix2pix: Learning to follow
image editing instructions. _arXiv preprint arXiv:2211.09800_, 2022. 2


[7] Tom Brown, Benjamin Mann, Nick Ryder, Melanie Subbiah, Jared D Kaplan, Prafulla Dhariwal,
Arvind Neelakantan, Pranav Shyam, Girish Sastry, Amanda Askell, et al. Language models are
few-shot learners. _Advances in neural information processing systems_, 33:1877–1901, 2020. 2


[8] Soravit Changpinyo, Piyush Sharma, Nan Ding, and Radu Soricut. Conceptual 12m: Pushing
web-scale image-text pre-training to recognize long-tail visual concepts. In _CVPR_, 2021. 2


[9] Wei-Lin Chiang, Zhuohan Li, Zi Lin, Ying Sheng, Zhanghao Wu, Hao Zhang, Lianmin Zheng,
Siyuan Zhuang, Yonghao Zhuang, Joseph E. Gonzalez, Ion Stoica, and Eric P. Xing. Vicuna:
An open-source chatbot impressing gpt-4 with 90%* chatgpt quality, March 2023. 1, 2, 4, 5, 6


[10] Aakanksha Chowdhery, Sharan Narang, Jacob Devlin, Maarten Bosma, Gaurav Mishra, Adam
Roberts, Paul Barham, Hyung Won Chung, Charles Sutton, Sebastian Gehrmann, et al. Palm:
Scaling language modeling with pathways. _arXiv preprint arXiv:2204.02311_, 2022. 2


[11] Hyung Won Chung, Le Hou, Shayne Longpre, Barret Zoph, Yi Tay, William Fedus, Eric Li,
Xuezhi Wang, Mostafa Dehghani, Siddhartha Brahma, et al. Scaling instruction-finetuned
language models. _arXiv preprint arXiv:2210.11416_, 2022. 2


[12] CVinW. Computer vision in the wild. `[https://github.com/](https://github.com/Computer-Vision-in-the-Wild/CVinW_Readings)`
`[Computer-Vision-in-the-Wild/CVinW_Readings](https://github.com/Computer-Vision-in-the-Wild/CVinW_Readings)`, 2022. 1


[13] Danny Driess, Fei Xia, Mehdi SM Sajjadi, Corey Lynch, Aakanksha Chowdhery, Brian Ichter,
Ayzaan Wahid, Jonathan Tompson, Quan Vuong, Tianhe Yu, et al. PaLM-E: An embodied
multimodal language model. _arXiv preprint arXiv:2303.03378_, 2023. 2


[14] Fartash Faghri, Hadi Pouransari, Sachin Mehta, Mehrdad Farajtabar, Ali Farhadi, Mohammad
Rastegari, and Oncel Tuzel. Reinforce data, multiply impact: Improved model accuracy and
robustness with dataset reinforcement. _arXiv preprint arXiv:2303.08983_, 2023. 2


[15] Oran Gafni, Adam Polyak, Oron Ashual, Shelly Sheynin, Devi Parikh, and Yaniv Taigman.
Make-a-scene: Scene-based text-to-image generation with human priors. _ArXiv_, abs/2203.13131,
2022. 1


10


[16] Zhe Gan, Linjie Li, Chunyuan Li, Lijuan Wang, Zicheng Liu, Jianfeng Gao, et al. Visionlanguage pre-training: Basics, recent advances, and future trends. _Foundations and Trends® in_
_Computer Graphics and Vision_, 2022. 1


[17] Fabrizio Gilardi, Meysam Alizadeh, and Maël Kubli. Chatgpt outperforms crowd-workers for
text-annotation tasks. _arXiv preprint arXiv:2303.15056_, 2023. 3


[18] Tanmay Gupta and Aniruddha Kembhavi. Visual programming: Compositional visual reasoning
without training. _arXiv preprint arXiv:2211.11559_, 2022. 2


[19] Weituo Hao, Chunyuan Li, Xiujun Li, Lawrence Carin, and Jianfeng Gao. Towards learning a
generic agent for vision-and-language navigation via pre-training. In _CVPR_, 2020. 2


[20] Shaohan Huang, Li Dong, Wenhui Wang, Yaru Hao, Saksham Singhal, Shuming Ma, Tengchao
Lv, Lei Cui, Owais Khan Mohammed, Qiang Liu, et al. Language is not all you need: Aligning
perception with language models. _arXiv preprint arXiv:2302.14045_, 2023. 2


[21] Gabriel Ilharco, Mitchell Wortsman, Ross Wightman, Cade Gordon, Nicholas Carlini, Rohan
Taori, Achal Dave, Vaishaal Shankar, Hongseok Namkoong, John Miller, Hannaneh Hajishirzi,
Ali Farhadi, and Ludwig Schmidt. Openclip. July 2021. If you use this software, please cite it
as below. 1


[22] Srinivasan Iyer, Xi Victoria Lin, Ramakanth Pasunuru, Todor Mihaylov, Dániel Simig, Ping Yu,
Kurt Shuster, Tianlu Wang, Qing Liu, Punit Singh Koura, et al. Opt-iml: Scaling language model
instruction meta learning through the lens of generalization. _arXiv preprint arXiv:2212.12017_,
2022. 2


[23] Menglin Jia, Luming Tang, Bor-Chun Chen, Claire Cardie, Serge Belongie, Bharath Hariharan,
and Ser-Nam Lim. Visual prompt tuning. In _ECCV_, 2022. 2


[24] Jing Yu Koh, Ruslan Salakhutdinov, and Daniel Fried. Grounding language models to images
for multimodal generation. _arXiv preprint arXiv:2301.13823_, 2023. 2


[25] Boyi Li, Kilian Q Weinberger, Serge Belongie, Vladlen Koltun, and René Ranftl. Languagedriven semantic segmentation. _ICLR_, 2022. 1


[26] Chunyuan Li, Zhe Gan, Zhengyuan Yang, Jianwei Yang, Linjie Li, Lijuan Wang, and Jianfeng
Gao. Multimodal foundation models: From specialists to general-purpose assistants. _arXiv_
_preprint arXiv:2309.10020_, 2023. 1


[27] Chunyuan Li, Haotian Liu, Liunian Harold Li, Pengchuan Zhang, Jyoti Aneja, Jianwei Yang,
Ping Jin, Houdong Hu, Zicheng Liu, Yong Jae Lee, and Jianfeng Gao. ELEVATER: A benchmark and toolkit for evaluating language-augmented visual models. In _NeurIPS Track on_
_Datasets and Benchmarks_, 2022. 1


[28] Junnan Li, Dongxu Li, Silvio Savarese, and Steven Hoi. Blip-2: Bootstrapping languageimage pre-training with frozen image encoders and large language models. _arXiv preprint_
_arXiv:2301.12597_, 2023. 1, 2, 4, 6, 7


[29] Liunian Harold Li, Pengchuan Zhang, Haotian Zhang, Jianwei Yang, Chunyuan Li, Yiwu
Zhong, Lijuan Wang, Lu Yuan, Lei Zhang, Jenq-Neng Hwang, et al. Grounded language-image
pre-training. In _CVPR_, 2022. 1


[30] Yuheng Li, Haotian Liu, Qingyang Wu, Fangzhou Mu, Jianwei Yang, Jianfeng Gao, Chunyuan
Li, and Yong Jae Lee. Gligen: Open-set grounded text-to-image generation. _arXiv preprint_
_arXiv:2301.07093_, 2023. 1


[31] Tsung-Yi Lin, Michael Maire, Serge Belongie, James Hays, Pietro Perona, Deva Ramanan,
Piotr Dollár, and C Lawrence Zitnick. Microsoft COCO: Common objects in context. In _ECCV_,
2014. 3


[32] Haotian Liu, Chunyuan Li, Yuheng Li, and Yong Jae Lee. Improved baselines with visual
instruction tuning, 2023. 9, 14


11


[33] Shilong Liu, Zhaoyang Zeng, Tianhe Ren, Feng Li, Hao Zhang, Jie Yang, Chunyuan Li, Jianwei
Yang, Hang Su, Jun Zhu, et al. Grounding dino: Marrying dino with grounded pre-training for
open-set object detection. _arXiv preprint arXiv:2303.05499_, 2023. 1


[34] Pan Lu, Swaroop Mishra, Tanglin Xia, Liang Qiu, Kai-Wei Chang, Song-Chun Zhu, Oyvind
Tafjord, Peter Clark, and Ashwin Kalyan. Learn to explain: Multimodal reasoning via thought
chains for science question answering. _Advances in Neural Information Processing Systems_,
2022. 2, 5, 8, 9


[35] OpenAI. ChatGPT. `[https://openai.com/blog/chatgpt/](https://openai.com/blog/chatgpt/)`, 2023. 1, 2


[36] OpenAI. Gpt-4 technical report, 2023. 1, 5, 6, 15


[37] Long Ouyang, Jeffrey Wu, Xu Jiang, Diogo Almeida, Carroll Wainwright, Pamela Mishkin,
Chong Zhang, Sandhini Agarwal, Katarina Slama, Alex Ray, et al. Training language models to
follow instructions with human feedback. _Advances in Neural Information Processing Systems_,
35:27730–27744, 2022. 2


[38] Baolin Peng, Chunyuan Li, Pengcheng He, Michel Galley, and Jianfeng Gao. Instruction tuning
with GPT-4. _arXiv preprint arXiv:2304.03277_, 2023. 1, 4


[39] Hieu Pham, Zihang Dai, Golnaz Ghiasi, Kenji Kawaguchi, Hanxiao Liu, Adams Wei Yu,
Jiahui Yu, Yi-Ting Chen, Minh-Thang Luong, Yonghui Wu, et al. Combined scaling for
open-vocabulary image classification. _arXiv preprint arXiv: 2111.10050_, 2021. 1


[40] Alec Radford, Jong Wook Kim, Chris Hallacy, Aditya Ramesh, Gabriel Goh, Sandhini Agarwal,
Girish Sastry, Amanda Askell, Pamela Mishkin, Jack Clark, et al. Learning transferable visual
models from natural language supervision. _arXiv preprint arXiv:2103.00020_, 2021. 1, 2, 4


[41] Colin Raffel, Noam Shazeer, Adam Roberts, Katherine Lee, Sharan Narang, Michael Matena,
Yanqi Zhou, Wei Li, and Peter J Liu. Exploring the limits of transfer learning with a unified
text-to-text transformer. _The Journal of Machine Learning Research_, 2020. 2


[42] Aditya Ramesh, Prafulla Dhariwal, Alex Nichol, Casey Chu, and Mark Chen. Hierarchical
text-conditional image generation with clip latents. _ArXiv_, abs/2204.06125, 2022. 1


[43] Robin Rombach, A. Blattmann, Dominik Lorenz, Patrick Esser, and Björn Ommer. Highresolution image synthesis with latent diffusion models. _CVPR_, pages 10674–10685, 2022.
1


[44] Chitwan Saharia, William Chan, Saurabh Saxena, Lala Li, Jay Whang, Emily L. Denton, Seyed
Kamyar Seyed Ghasemipour, Burcu Karagol Ayan, Seyedeh Sara Mahdavi, Raphael Gontijo
Lopes, Tim Salimans, Jonathan Ho, David J. Fleet, and Mohammad Norouzi. Photorealistic
text-to-image diffusion models with deep language understanding. _ArXiv_, abs/2205.11487,
2022. 1


[45] Christoph Schuhmann, Romain Beaumont, Richard Vencu, Cade Gordon, Ross Wightman,
Mehdi Cherti, Theo Coombes, Aarush Katta, Clayton Mullis, Mitchell Wortsman, et al. Laion5b: An open large-scale dataset for training next generation image-text models. _arXiv preprint_
_arXiv:2210.08402_, 2022. 2


[46] Dídac Surís, Sachit Menon, and Carl Vondrick. Vipergpt: Visual inference via python execution
for reasoning. _arXiv preprint arXiv:2303.08128_, 2023. 2


[47] Andrew Szot, Alex Clegg, Eric Undersander, Erik Wijmans, Yili Zhao, John Turner, Noah
Maestre, Mustafa Mukadam, Devendra Chaplot, Oleksandr Maksymets, Aaron Gokaslan,
Vladimir Vondrus, Sameer Dharur, Franziska Meier, Wojciech Galuba, Angel Chang, Zsolt Kira,
Vladlen Koltun, Jitendra Malik, Manolis Savva, and Dhruv Batra. Habitat 2.0: Training home
assistants to rearrange their habitat. In _Advances in Neural Information Processing Systems_
_(NeurIPS)_, 2021. 2


[48] Rohan Taori, Ishaan Gulrajani, Tianyi Zhang, Yann Dubois, Xuechen Li, Carlos Guestrin, Percy
Liang, and Tatsunori B. Hashimoto. Stanford alpaca: An instruction-following llama model.
`[https://github.com/tatsu-lab/stanford_alpaca](https://github.com/tatsu-lab/stanford_alpaca)`, 2023. 1, 4


12


[49] Hugo Touvron, Thibaut Lavril, Gautier Izacard, Xavier Martinet, Marie-Anne Lachaux, Timothée Lacroix, Baptiste Rozière, Naman Goyal, Eric Hambro, Faisal Azhar, et al. Llama: Open
and efficient foundation language models. _arXiv preprint arXiv:2302.13971_, 2023. 1


[50] Jianfeng Wang, Zhengyuan Yang, Xiaowei Hu, Linjie Li, Kevin Lin, Zhe Gan, Zicheng Liu,
Ce Liu, and Lijuan Wang. Git: A generative image-to-text transformer for vision and language.
_arXiv preprint arXiv:2205.14100_, 2022. 1


[51] Yizhong Wang, Yeganeh Kordi, Swaroop Mishra, Alisa Liu, Noah A Smith, Daniel Khashabi,
and Hannaneh Hajishirzi. Self-instruct: Aligning language model with self generated instructions. _arXiv preprint arXiv:2212.10560_, 2022. 2


[52] Yizhong Wang, Swaroop Mishra, Pegah Alipoormolabashi, Yeganeh Kordi, Amirreza Mirzaei,
Anjana Arunkumar, Arjun Ashok, Arut Selvan Dhanasekaran, Atharva Naik, David Stap, et al.
Benchmarking generalization via in-context instructions on 1,600+ language tasks. _arXiv_
_preprint arXiv:2204.07705_, 2022. 2


[53] Chenfei Wu, Shengming Yin, Weizhen Qi, Xiaodong Wang, Zecheng Tang, and Nan Duan.
Visual chatgpt: Talking, drawing and editing with visual foundation models. _arXiv preprint_
_arXiv:2303.04671_, 2023. 2


[54] Jianwei Yang, Chunyuan Li, Pengchuan Zhang, Bin Xiao, Lu Yuan, Ce Liu, and Jianfeng Gao.
Unified contrastive learning in image-text-label space. _CVPR_, 2022. 1


[55] Zhengyuan Yang, Linjie Li, Jianfeng Wang, Kevin Lin, Ehsan Azarnasab, Faisal Ahmed,
Zicheng Liu, Ce Liu, Michael Zeng, and Lijuan Wang. Mm-react: Prompting chatgpt for
multimodal reasoning and action. _arXiv preprint arXiv:2303.11381_, 2023. 2


[56] Jiahui Yu, Yuanzhong Xu, Jing Yu Koh, Thang Luong, Gunjan Baid, Zirui Wang, Vijay
Vasudevan, Alexander Ku, Yinfei Yang, Burcu Karagol Ayan, Benton C. Hutchinson, Wei Han,
Zarana Parekh, Xin Li, Han Zhang, Jason Baldridge, and Yonghui Wu. Scaling autoregressive
models for content-rich text-to-image generation. _ArXiv_, abs/2206.10789, 2022. 1


[57] Lu Yuan, Dongdong Chen, Yi-Ling Chen, Noel Codella, Xiyang Dai, Jianfeng Gao, Houdong
Hu, Xuedong Huang, Boxin Li, Chunyuan Li, et al. Florence: A new foundation model for
computer vision. _arXiv preprint arXiv:2111.11432_, 2021. 1


[58] Hao Zhang, Feng Li, Xueyan Zou, Shilong Liu, Chunyuan Li, Jianfeng Gao, Jianwei Yang,
and Lei Zhang. A simple framework for open-vocabulary segmentation and detection. _arXiv_
_preprint arXiv:2303.08131_, 2023. 1


[59] Renrui Zhang, Jiaming Han, Aojun Zhou, Xiangfei Hu, Shilin Yan, Pan Lu, Hongsheng Li,
Peng Gao, and Yu Qiao. Llama-adapter: Efficient fine-tuning of language models with zero-init
attention. _arXiv preprint arXiv:2303.16199_, 2023. 2, 8, 9


[60] Susan Zhang, Stephen Roller, Naman Goyal, Mikel Artetxe, Moya Chen, Shuohui Chen,
Christopher Dewan, Mona Diab, Xian Li, Xi Victoria Lin, et al. OPT: Open pre-trained
transformer language models. _arXiv preprint arXiv:2205.01068_, 2022. 2


[61] Zhuosheng Zhang, Aston Zhang, Mu Li, Hai Zhao, George Karypis, and Alex Smola. Multimodal chain-of-thought reasoning in language models. _arXiv preprint arXiv:2302.00923_, 2023.
8, 9


[62] Yiwu Zhong, Jianwei Yang, Pengchuan Zhang, Chunyuan Li, Noel Codella, Liunian Harold Li,
Luowei Zhou, Xiyang Dai, Lu Yuan, Yin Li, et al. Regionclip: Region-based language-image
pretraining. In _Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern_
_Recognition_, pages 16793–16803, 2022. 1


[63] Xueyan Zou, Zi-Yi Dou, Jianwei Yang, Zhe Gan, Linjie Li, Chunyuan Li, Xiyang Dai, Harkirat
Behl, Jianfeng Wang, Lu Yuan, et al. Generalized decoding for pixel, image, and language.
_arXiv preprint arXiv:2212.11270_, 2022. 1, 2


13


**A** **Broader Impact**


The broader impact of LLaVA, a general-purpose visual assistant, has potential benefits and risks
associated with its deployment and release. Some considerations are unique to LLaVA due to its
visual nature, while others share similarities with existing instruction-following LLMs ( _e.g.,_ Alpaca,
Vicuna, _etc._ ). As LLaVA is built upon LLaMA, Vicuna, and CLIP, it inherits some of the issues
associated with LLMs and vision encoders. In the following, we outline both the risks and mitigation
strategies in place for the release of this model.


**Malicious input.** To minimize potential misuse and harmful consequences, we employ two precautionary measures for LLaVA: (1) _OpenAI Filter API_ for user input text to prevent harmful or
inappropriate text instructions from being processed by the model, and (2) _NSFW Filter_ for uploaded
user images to detect and block Not Safe For Work (NSFW) content or any other potentially harmful
image inputs.


**Hallucination.** Similar to LLMs, LLaVA might generate outputs that aren’t grounded in facts
or input data. This raises concerns about inferences made, especially in critical applications ( _e.g.,_
medical).


**Biases.** Bias can be transferred from the base models to LLaVA, both from the vision encoder
(CLIP) and the language decoder (LLaMA/Vicuna). This may lead to biased outcomes or unfair
representations of diverse content.


**Energy consumption.** Though energy consumption is not a primary concern for LLaVA due to
a smaller pretraining dataset (see details in Sec. C), it may become a concern when scaling up the
pretraining dataset or increasing the model size, e.g., to a larger LLaMA version like the 65B model.


**Evaluation complexities.** Assessing the performance of LLaVA is challenging as it involves both
language and visual tasks. Our evaluation benchmark covers several aspects, including accuracy,
concept coverage, reasoning ability, and creativity. However, additional aspects need consideration,
such as the degree of visual content hallucination and fine-grained understanding of visual content.
While text-only GPT-4 based multimodal evaluation is consistent and accurate in our study, its
robustness in different situations and capability to evaluate other unexplored aspects are subjects for
future work.


Despite these risks, we believe that the benefits of releasing LLaVA to the research community
outweigh the potential harm. It allows for ongoing investigation and improvement of the model and
engages the community in developing better mitigation strategies to address these concerns. Moreover,
the release of LLaVA can spur the development of new applications and research directions, ultimately
contributing to the progress and responsible deployment of foundation models in vision-language
tasks.


**B** **More Results**


We present more qualitative results of LLaVA to analyze its emergent behaviors and observed
weaknesses. For more quantitative results of LLaVA on academic benchmarks, please refer to the
improved baselines with visual instruction tuning [32]. In Table 9, LLaVA demonstrates a similar
behavior as GPT-4 in another example from its paper. Similar to the GPT-4 live demo by OpenAI,
LLaVA is capable of generating the HTML/JS/CSS code for an interactive joke website based on
a simplified user input sketch in Fig. 2, despite a minor error. As shown in Fig. 3, LLaVA can
follow user’s instructions in a conversational style and provide detailed responses or creative writings.
Furthermore, LLaVA is able to relate the visual content to the textual knowledge from the pretrained
LLM, as demonstrated in Fig. 4 and Fig. 5.


One interesting emergent behavior of LLaVA is that it is able to understand visual contents that
are not covered in the training. For example, in Fig. 6, it is able to recognize Elon Musk both in a
headshot and in a humorous meme where he is dressed as a doge, even though Elon Musk _never_
appears in the training data for either the visual feature alignment or visual instruction tuning stages of


14


LLaVA. LLaVA also demonstrates impressive OCR (optical character recognition) ability in Table 9
and Fig. 2, which is rarely covered in our training data.


We hope these additional results and observations showcase the potential of LLaVA in various
application areas. In future work, it is important to investigate these emergent behaviors more
thoroughly and to understand the underlying mechanisms that enable LLaVA to demonstrate such
generalization abilities. This will pave the way towards building better LMMs, including enhancing
robustness, reducing biases, and improving the alignment and the scope of the learned vision-language
representations.


**Visual input example, Chicken Nugget Map:**


User Can you explain this meme in detail?
LLaVA The meme in the image is a creative and humorous take on food, with a focus on chicken
nuggets, as the center of the universe. The meme begins with the phrase "Sometimes I just
look at pictures of the Earth from space and I marvel at how beautiful it all is..." The main
image features a tray of cooked chicken nuggets, with the chicken pieces positioned to
resemble the continents and islands on a world map. The meme playfully suggests that the
chicken nuggets represent the Earth, and the various locations depicted in the photo are
actually chicken nugget versions of different places. The punchline of the meme appears
in smaller text at the bottom, reading "I mean, it’s not the real Earth, but how beautiful it
is all is." This lighthearted and entertaining meme combines food and humor, using the
image of chicken nuggets to create a funny and imaginative representation of the world.


User Can you explain this meme?
GPT-4 [36] This meme is a joke that combines two unrelated things: pictures of the earth from space
and chicken nuggets. The text of the meme suggests that the image below is a beautiful
picture of the earth from space. However, the image is actually of chicken nuggets
arranged to vaguely resemble a map of the world. The humor in this meme comes from
the unexpected juxtaposition of the text and the image. The text sets up an expectation of a
majestic image of the earth, but the image is actually something mundane and silly.


User Can you explain this meme in detail?
BLIP-2 sometimes i just look at pictures of the earth from space and marvel how beautiful it is


User Can you explain this meme in detail?
OpenFlamingo It’s a picture of a chicken nugget on the International Space Station.


Table 9: Example prompt comparing LLaVA, GPT-4, BLIP-2, and OpenFlamingo’s visual reasoning
capabilities in understanding the humor. BLIP-2 and OpenFlamingo fail to follow the user’s
instructions. LLaVA and GPT-4 both explain the meme and its humor, while GPT-4 produces a more
concise answer.


15



![](images/img_000.jpg)
![](images/img_001.jpg)

![](images/img_002.jpg)

User


_Place the generated HTML code into an HTML renderer to render the web page._


Rendered website Rendered website
(clicked the button)


Figure 2: LLaVA generates HTML/JS code for an interactive website based on user sketch inputs.
The interactive interface works after fixing a minor error ( _in red_ ) in the generated output. There is
room for improvement in LLaVA’s output, such as splitting the joke and punchline into two rows,
and only revealing the punchline upon button click, to better reflect the user’s intent.


16



![](images/img_003.jpg)

![](images/img_004.jpg)
LLaVA


LLaVA


LLaVA


LLaVA



![](images/img_005.jpg)

![](images/img_006.jpg)

Certainly! Here's a simple fruit salad recipe using the items in your refrigerator:


Ingredients:

- 2 cups fresh strawberries, sliced

- 1 cup fresh blueberries

- 1 large carrot, grated

- Juice of half a lemon

- A handful of chopped fresh parsley or mint

- A few ice cubes

- Optional: honey or maple syrup (adjust to taste)


Instructions:
1. In a large bowl, combine the sliced strawberries, blueberries, and carrot. Gently toss them together to mix.
2. Drizzle the juice of half a lemon over the fruit and vegetables to prevent them from oxidizing and add a refreshing citrus flavor.
3. Sprinkle the chopped fresh parsley or mint over the fruit and gently toss once more.
4. If desired, add a drizzle of honey or maple syrup for a touch of sweetness. Adjust the amount according to your taste preferences.
5. Cover the bowl and refrigerate the fruit salad for at least 30 minutes or up to a few hours. This allows the flavors to meld and creates a
more refreshing salad.
6. Serve the fruit salad in cups or bowls, garnished with a sprinkle of fresh parsley or mint, if desired.


This fruit salad recipe is perfect for a healthy snack or side dish, and with the variety of ingredients available in your refrigerator, it should be
easy to put together quickly.



User


User


User


User



![](images/img_007.jpg)

![](images/img_008.jpg)

![](images/img_009.jpg)

Figure 3: LLaVA is capable of recognizing the visual content following the user’s intent, without
directly prompting for visual recognition. It also provides a detailed response when prompted with a
follow-up request, and the generated response is closely related to the provided visual content.


17


![](images/img_010.jpg)

User


Figure 4: LLaVA relates the movie scenes to the textual knowledge from the pretrained LLM.


User


User


Figure 5: LLaVA recognizes the famous art work, Mona Lisa, by Leonardo da Vinci. When we start
a new conversation, it also explains the humourous artwork created on the web, mimicking the Mona
Lisa.


18



![](images/img_011.jpg)

![](images/img_012.jpg)

![](images/img_013.jpg)

![](images/img_014.jpg)

![](images/img_015.jpg)
LLaVA


LLaVA



The name of the man in the photo is Elon Musk.


The name of the man in the photo is Elon Musk.



![](images/img_017.jpg)

_Start a new conversation, and the history is cleared._



User


User



![](images/img_016.jpg)

![](images/img_018.jpg)

![](images/img_019.jpg)

Figure 6: An interesting emergent behavior of LLaVA is its ability to recognize Elon Musk both in a
headshot and in a humorous meme where he is dressed as a doge. This implies that the pre-trained
CLIP vision encoder may have seen images of Elon Musk. However, it is still surprising because Elon
Musk _never_ appears in the training data for either the visual feature alignment or visual instruction
tuning stages of LLaVA, which indicates that the base language model generalizes to unseen visual
concepts.


Table 10: One example on how the text-only GPT-4 acts as a judge to ensemble the predictions from
LLaVA and a text-only GPT-4, and gives a correct final answer.


19



![](images/img_020.jpg)

![](images/img_021.jpg)
**C** **Training Details**


We pre-train our model on the filtered CC-595K subset for 1 epoch with a learning rate of 2e-3 and a
batch size of 128, and fine-tune on the proposed LLaVA-Instruct-158K dataset for 3 epochs, with a
learning rate of 2e-5 and a batch size of 32. Following Vicuna, we use the Adam optimizer with no
weight decay and a cosine learning rate with a warmup ratio of 3%. During finetuning, FSDP (Full
Shard Data Parallel) and gradient checkpointing is used to save GPU memory, and offloading is not
used. BF16 and TF32 are enabled to achieve a balance between speed and precision.


We train all models with 8 _×_ A100s. Pretraining on CC-595K completes within 4 hours. Finetuning
on Instruct-158K completes within 10 hours. Finetuning on ScienceQA completes within 4 hours.


**D** **Assets**


Our source code, generated instruction-tuning data, proposed benchmark are uploaded to the
[anonymized GitHub repository: LLaVA-Annonymous/LLaVA.](https://github.com/LLaVA-Annonymous/LLaVA)


[1. Source Code: link](https://github.com/LLaVA-Annonymous/LLaVA)

[2. README: link](https://github.com/LLaVA-Annonymous/LLaVA)

[3. Instructions to launch the demo: link](https://github.com/LLaVA-Annonymous/LLaVA#web-ui)

[4. All prompts and few shot examples for querying GPT-4: link](https://github.com/LLaVA-Annonymous/LLaVA/tree/master/playground/data/prompts)

[5. LLaVA-Instruct-158K: link](https://github.com/LLaVA-Annonymous/LLaVA/blob/master/playground/data/llava_instruct_150k.json)

[6. LLaVA-Bench: COCO, In-The-Wild](https://github.com/LLaVA-Annonymous/LLaVA/blob/master/playground/data/coco2014_val_gpt4_qa_30x3.jsonl)

7. Model checkpoints. The size of the model checkpoints after compression is 25GB, which
exceeds the 5GB limit of GitHub LFS (Large File Storage). We’ll release the checkpoint to
the public, or upon request with reviewers for this submission.


**E** **Data**


**Instructions for brief image description.** The list of instructions used to briefly describe the image
content are shown in Table 11. They present the same meaning with natural language variance.


Table 11: The list of instructions for brief image description.


**Instructions for detailed image description.** The list of instructions used to describe the image
content in detail are shown in Table 12. They present the same meaning with natural language
variance.


**CC3M.** We extract noun-phrases using Spacy for each caption over the whole CC3M dataset, and
count the frequency of each unique noun-phrase. We skip noun-phrases whose frequency is smaller
than 3, as they are usually rare combinations concept and attributes that has already been covered


20



![](images/img_022.jpg)
![](images/img_025.jpg)

Table 12: The list of instructions for detailed image description.


by other captions. We then start from the noun-phrases with lowest remaining frequency, add the
captions that contain this noun-phrase to the candidate pool. If the frequency of the noun-phrase
is larger than 100, we randomly choose a subset of size 100 out of all its captions. This results in
around 595K image-text pairs.


The comparison of noun-phrase statistics before and after filtering CC3M is shown in Figure 7. The
filtered dataset shows a good coverage of concepts whose frequency is higher from 3, but with a
smaller number of image-text pairs.

|Col1|CC3M: 108182<br>CC3M (Filtered): 31423|Col3|
|---|---|---|
||||
||||



Figure 7: Comparison of noun-phrase statistics before and after filtering CC3M. The total number of
unique noun-phrases are reported in the legend.


**F** **Prompts**


The prompt used to generate image-based conversation from ChatGPT/GPT-4 is shown in Table 13.


21


![](images/img_026.jpg)

Table 13: For each query, we illustrate the prompt construction process for ChatGPT/GPT-4 to
collect `query[‘response’]` from `query[‘context’]`, using few-shot in-context-learning, where
examples are from `fewshot_samples`, each example including input `sample[‘context’]` and
output `sample[‘response’]` . Note that `messages` is the final prompt. In this example, we provide
the prompt used to generate the conversation response, please see also see its in-context-learning
examples in Table 15 and Table 16 for details. We recommend readers to check out the codebase for
the prompts to generated two other types of responses, including detailed decription and complex
reasoning.


22


![](images/img_027.jpg)

![](images/img_028.jpg)

Table 14: One example to illustrate the instruction-following data. The top block shows the contexts
such as captions and boxes used to prompt GPT, and the bottom block shows the three types of
responses. Note that the visual image is not used to prompt GPT, we only show it here as a reference.


23


![](images/img_029.jpg)

Table 15: One example used in in-context-learning to construct visual conversation data.


24


![](images/img_030.jpg)

Table 16: One example used in in-context-learning to construct visual conversation data.


25


