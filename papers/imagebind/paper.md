                                                                 I MAGE B IND: One Embedding Space To Bind Them All

                                                              Rohit Girdhar∗     Alaaeldin El-Nouby∗      Zhuang Liu     Mannat Singh
                                                                        Kalyan Vasudev Alwala      Armand Joulin     Ishan Misra∗
                                                                                            FAIR, Meta AI
                                                                                   https://facebookresearch.github.io/ImageBind




arXiv:2305.05665v2 [cs.CV] 31 May 2023
                                          1) Cross-Modal Retrieval
                                             Audio                       Images & Videos                              Depth                                      Text
                                                                                                                                                “A fire crackles while a pan of food is frying on
                                                                                                                                                the fire.”
                                                                                                                                                “Fire is crackling then wind starts blowing.”
                                          Crackle of a Fire                                                                                     “Firewood crackles then music...”

                                                                                                                                                “A baby is crying while a toddler is laughing.”
                                                                                                                                                “A baby is laughing while an adult is laughing.”
                                                                                                                                                “A baby laughs and something…”
                                           Baby Cooing


                                          2) Embedding-Space Arithmetic                                       3) Audio to Image Generation


                                                                                                               Dog             Engine            Fire                      Rain
                                                               Waves


                                         Figure 1. I MAGE B IND’s joint embedding space enables novel multimodal capabilities. By aligning six modalities’ embedding into a
                                         common space, I MAGE B IND enables: 1) Cross-Modal Retrieval, which shows emergent alignment of modalities such as audio, depth or
                                         text, that aren’t observed together. 2) Adding embeddings from different modalities naturally composes their semantics. And 3) Audio-to-
                                         Image generation, by using our audio embeddings with a pre-trained DALLE-2 [61] decoder designed to work with CLIP text embeddings.

                                                                       Abstract                                 1. Introduction
                                             We present I MAGE B IND, an approach to learn a joint                 A single image can bind together many experiences – an
                                         embedding across six different modalities - images, text, au-          image of a beach can remind us of the sound of waves, the
                                         dio, depth, thermal, and IMU data. We show that all combi-             texture of the sand, a breeze, or even inspire a poem. This
                                         nations of paired data are not necessary to train such a joint         ‘binding’ property of images offers many sources of super-
                                         embedding, and only image-paired data is sufficient to bind            vision to learn visual features, by aligning them with any
                                         the modalities together. I MAGE B IND can leverage recent              of the sensory experiences associated with images. Ideally,
                                         large scale vision-language models, and extends their zero-            for a single joint embedding space, visual features should
                                         shot capabilities to new modalities just by using their natu-          be learned by aligning to all of these sensors. However, this
                                         ral pairing with images. It enables novel emergent applica-            requires acquiring all types and combinations of paired data
                                         tions ‘out-of-the-box’ including cross-modal retrieval, com-           with the same set of images, which is infeasible.
                                         posing modalities with arithmetic, cross-modal detection
                                         and generation. The emergent capabilities improve with the                 Recently, many methods learn image features aligned
                                         strength of the image encoder and we set a new state-of-the-           with text [1, 31, 46, 60, 64, 65, 82, 83], audio [3, 4, 50,
                                         art on emergent zero-shot recognition tasks across modal-              55, 56, 70] etc. These methods use a single pair of modal-
                                         ities, outperforming specialist supervised models. Finally,            ities or, at best, a few visual modalities. However, the fi-
                                         we show strong few-shot recognition results outperforming              nal embeddings are limited to the pairs of modalities used
                                         prior work, and that I MAGE B IND serves as a new way to               for training. Thus, video-audio embeddings cannot directly
                                         evaluate vision models for visual and non-visual tasks.                be used for image-text tasks and vice versa. A major ob-
                                                                                                                stacle in learning a true joint embedding is the absence of
                                                                                                                large quantities of multimodal data where all modalities are
                                            ∗ Equal technical contribution.                                     present together.
    In this paper, we present I MAGE B IND, which learns a        adds an image captioning objective on top of the contrastive
single shared representation space by leveraging multiple         loss for improved performance. Flamingo [1] handles arbi-
types of image-paired data. It does not need datasets where       trarily interleaved images and texts, and achieves state of the
all modalities co-occur with each other. Instead, we lever-       art on many few-shot learning benchmarks. LiT [84] adopts
age the binding property of images and we show that just          contrastive training for fine-tuning and observes freezing
aligning each modality’s embedding to image embeddings            image encoders works the best. This prior line of works
leads to an emergent alignment across all of the modalities.      mostly considers image and text, while our work enables
In practice, I MAGE B IND leverages web-scale (image, text)       zero-shot recognition on multiple modalities.
paired data and combines it with naturally occurring paired       Multi-Modal Learning. Our work binds multiple modal-
data such as (video, audio), (image, depth) etc. to learn         ity representations in a joint embedding space. Prior works
a single joint embedding space. This allows I MAGE B IND          explored joint training of multiple modalities in a super-
to implicitly align the text embeddings to other modalities       vised [21, 42] or self-supervised contexts [3, 20, 50, 70, 74].
such as audio, depth etc., enabling zero-shot recognition ca-     The success of image and language pre-training methods
pabilities on that modality without explicit semantic or tex-     such as CLIP has inspired approaches that revisits learn-
tual pairing. Moreover, we show that it can be initialized        ing deep semantic representations through matching other
with large-scale vision-language models such as CLIP [60],        modalities with linguistic inputs. Various methods adapt
thereby leveraging the rich image and text representations        CLIP to extract semantically strong video representations
of these models. Thus, I MAGE B IND can be applied to a           [15, 43, 45, 79]. Most related to our method, Nagrani et
variety of different modalities and tasks with little training.   al. [51] create a weakly-labeled dataset for paired video-
    We use large-scale image-text paired data along with nat-     audio and captions that allows for training multi-modal
urally paired ‘self-supervised’ data across four new modal-       video-audio encoder to match textual features resulting in
ities - audio, depth, thermal, and Inertial Measurement Unit      strong audio and video retrieval and captioning perfor-
(IMU) readings – and show strong emergent zero-shot clas-         mance. AudioCLIP [27] adds audio as an additional modal-
sification and retrieval performance on tasks for each of         ity into a CLIP framework, enabling zero-shot audio classi-
these modalities. These emergent properties improve as the        fication. In contrast, I MAGE B IND does not require explicit
underlying image representation is made stronger. On au-          paired data between all modalities and instead leverages im-
dio classification and retrieval benchmarks, I MAGE B IND’s       age as a natural weak supervision for unifying modalities.
emergent zero-shot classification matches or outperforms          Feature Alignment Pre-trained CLIP models have been
specialist models trained with direct audio-text supervision      utilized as teachers to supervise other models due to the
on benchmarks like ESC, Clotho, AudioCaps. I MAGE B IND           strength of its visual representations [44, 58, 75]. More-
representations also outperform specialist supervised mod-        over, CLIP joint image and text embedding space has also
els on few-shot evaluation benchmarks. Finally, we show           been leveraged for a variety of zero-shot tasks like de-
that I MAGE B IND’s joint embeddings can be used for a wide       tection [24, 88], segmentation [41], mesh animation [81]
variety of compositional tasks as illustrated in Figure 1, in-    etc. showing the power of joint embedding spaces. Point-
cluding cross-modal retrieval, combining embeddings via           CLIP [85] finds a pre-trained CLIP encoder can be used for
arithmetic, detecting audio sources in images, and generat-       3D recognition by projecting a point cloud to a number of
ing images given audio input.                                     2D depth map views, which in turn are encoded using CLIP
                                                                  visual encoder. In multilingual neural machine translation,
2. Related Work                                                   a similar phenomenon to the emergence behavior of I M -
                                                                  AGE B IND is commonly observed and utilized: if languages
    I MAGE B IND builds upon several advances in vision-          are trained in the same latent space through learned implicit
language, multimodal, and self-supervised research.               bridging, translation can be done between language pairs on
Language Image Pre-training. Training images jointly              which no paired data is provided [33, 40].
with linguistic signals like words or sentences has been
shown to be an effective method for zero-shot, open-              3. Method
vocabulary recognition and text to image retrieval [14, 18,
38, 68]. Language as supervision can further be used for             Our goal is to learn a single joint embedding space for all
learning strong video representations [2, 47, 48]. Joulin et      modalities by using images to bind them together. We align
al. [34] show that using large-scale image dataset with noisy     each modality’s embedding to image embeddings, such as
captions yields strong visual features. Recently, CLIP [60],      text to image using web data and IMU to video using video
ALIGN [31] and Florence [83] collect large collections of         data captured from egocentric cameras with IMU. We show
image and text pairs and train models to embed image and          that the resulting embedding space has a powerful emer-
language inputs in a joint space using contrastive learning,      gent zero-shot behavior that automatically associates pairs
exhibiting impressive zero-shot performance. CoCa [82]            of modalities without seeing any training data for that spe-
                                                    Naturally Aligned                                                                                                                                   IMAGEBIND
 Images Videos   Text   Audio Depth Thermal IMU     Emergent Alignment

Web Image-Text             Depth Sensor Data      Web Videos             Thermal Data                                              Egocentric Videos




Figure 2. I MAGE B IND overview. Different modalities occur naturally aligned in different data sources, for instance images+text and
video+audio in web data, depth or thermal information with images, IMU data in videos captured with egocentric cameras, etc. I MAGE -
B IND links all these modalities in a common embedding space, enabling new emergent alignments and capabilities.


cific pair. We illustrate our approach in Figure 2.                           are optimized using an InfoNCE [54] loss:

3.1. Preliminaries                                                                L_{\setimage ,\setmodality } = - \log \frac {\exp (\bq _{i}^{\intercal } \bk _i/\tau )}{\exp (\bq _{i}^{\intercal } \bk _i/\tau ) + \sum _{j \neq i}\exp (\bq _{i}^{\intercal } \bk _j/\tau )}, \label {eq:contrastive_loss}  (1)
Aligning specific pairs of modalities. Contrastive learn-
                                                                              where τ is a scalar temperature that controls the smoothness
ing [28] is a general technique for learning an embedding
                                                                              of the softmax distribution and j denotes unrelated observa-
space by using pairs of related examples (positives) and un-
                                                                              tions, also called ‘negatives’. We follow [76] and consider
related examples (negatives). Using pairs of aligned ob-
                                                                              every example j ̸= i in the mini-batch to be a negative. The
servations, contrastive learning can align pairs of modal-
                                                                              loss makes the embeddings qi and ki closer in the joint em-
ities such as (image, text) [60], (audio, text) [27], (image,
                                                                              bedding space, and thus aligns I and M. In practice, we
depth) [70], (video, audio) [50] etc. However, in each case,
                                                                              use a symmetric loss LI,M + LM,I .
the joint embeddings are trained and evaluated using the
                                                                              Emergent alignment of unseen pairs of modalities. I M -
same pairs of modalities. Thus, (video, audio) embeddings
                                                                              AGE B IND uses modalities paired with images, i.e., pairs of
are not directly applicable for text-based tasks while (image,
                                                                              the form (I, M) to align each the embeddings from each
text) embeddings cannot be applied for audio tasks.
                                                                              modality M to those from images. We observe an emer-
Zero-shot image classification using text prompts.
                                                                              gent behavior in the embedding space that aligns two pairs
CLIP [60] popularized a ‘zero-shot’ classification task
                                                                              of modalities (M1 , M2 ) even though we only train using
based on an aligned (image, text) embedding space. This
                                                                              the pairs (I, M1 ) and (I, M2 ). This behavior allows us
involves constructing a list of text descriptions that describe
                                                                              to perform a wide variety of zero-shot and cross-modal re-
the classes in a dataset. An input image is classified based
                                                                              trieval tasks without training for them. We achieve state-
on its similarity to the text descriptions in the embedding
                                                                              of-the-art zero-shot text-audio classification results without
space. Unlocking such zero-shot classification for other
                                                                              observing a single sample of paired (audio, text).
modalities requires specifically training using paired text
data, e.g., (audio, text) [27] or (point-clouds, text) [85]. In               3.3. Implementation Details
contrast, I MAGE B IND unlocks zero-shot classification for
                                                                                  I MAGE B IND is conceptually simple and can be imple-
modalities without paired text data.
                                                                              mented in many different ways. We deliberately choose a
3.2. Binding modalities with images                                           vanilla implementation that is flexible and allows for an ef-
                                                                              fective study and easy adoption. In § 5, we present design
    I MAGE B IND uses pairs of modalities (I, M), where I                     decisions that are critical for good emergent ‘binding’.
represents images and M is another modality, to learn a sin-                  Encoding modalities. We use a Transformer architec-
gle joint embedding. We use large-scale web datasets with                     ture [73] for all the modality encoders. We use the Vision
(image, text) pairings that span a wide range of semantic                     Transformer (ViT) [13] for images. Following [20], we use
concepts. Additionally, we use the natural, self-supervised                   the same encoder for images and videos. We temporally
pairing of other modalities – audio, depth, thermal, and In-                  inflate [7] the patch projection layer of the ViT and use 2
tertial Measurement Unit (IMU) – with images.                                 frame video clips sampled from 2 seconds. We follow [22]
    Consider the pair of modalities (I, M) with aligned ob-                   for encoding audio and convert a 2 second audio sampled at
servations. Given an image Ii and its corresponding obser-                    16kHz into spectrograms using 128 mel-spectrogram bins.
vation in the other modality Mi , we encode them into nor-                    As the spectrogram is also a 2D signal like an image, we use
malized embeddings: qi = f (Ii ) and ki = g(Mi ) where                        a ViT with a patch size of 16 and stride 10. We treat ther-
f, g are deep networks. The embeddings and the encoders                       mal images and depth images as one-channel images and
 Dataset                            Task       #cls Metric #test         pretrained vision (ViT-H 630M params) and text encoders
 Audioset Audio-only (AS-A) [19]  Audio cls. 527 mAP 19048
 ESC 5-folds (ESC) [59]           Audio cls. 50 Acc        400
                                                                         (302M params) from OpenCLIP [11, 30].
 Clotho (Clotho) [17]              Retrieval    - Recall 1045            Encoders for each modality. We convert audio into 2D
 AudioCaps (AudioCaps) [37]        Retrieval    - Recall 796             mel-spectrograms [22], and thermal and depth modalities
 VGGSound (VGGS) [8]              Audio cls. 309 Acc 14073               into 1 channel images and use ViT-B, ViT-S encoders re-
 SUN Depth-only (SUN-D) [69]      Scene cls. 19 Acc 4660
 NYU-v2 Depth-only (NYU-D) [66] Scene cls. 10 Acc          653
                                                                         spectively. The image and text encoders are kept frozen
 LLVIP (LLVIP) [32]               Person cls. 2      Acc 15809           during the I MAGE B IND training and the audio, depth, ther-
 Ego4D (Ego4D) [23]              Scenario cls. 108 Acc 68865             mal, and IMU encoders are updated.
                                                                         Emergent zero-shot vs. zero-shot. Methods such as
Table 1. Emergent zero-shot classification datasets for audio,           CLIP [60], AudioCLIP [27] etc. train with modality pairs,
depth, thermal, and Inertial Measurement Unit (IMU) modalities.          (image, text) and (audio, text), to demonstrate zero-shot
We evaluate I MAGE B IND without training for any of these tasks
                                                                         classification using text-prompts for the same modality. In
and without training on paired text data for these modalities. For
each dataset, we report the task (classification or retrieval), number
                                                                         contrast, I MAGE B IND binds modalities together using only
of classes (#cls), metric for evaluation (Accuracy or mean Average       image-paired data. Thus, just by training on (image, text)
Precision), and the number of test samples (#test).                      and (image, audio), I MAGE B IND can perform zero-shot
                                                                         classification of audio using text prompts. As we do not
                                                                         directly train for this ability, we term it emergent zero-shot
also use a ViT to encode them. We follow [21] to convert                 classification to distinguish it from methods that specifically
depth into disparity maps for scale invariance. We extract               train using paired text-supervision for all modalities.
the IMU signal consisting of accelerometer and gyroscope                 Evaluation on downstream tasks. We comprehensively
measurements across the X, Y , and Z axes. We use 5 sec-                 evaluate I MAGE B IND on a many different downstream
ond clips resulting in 2K time step IMU readings which are               tasks using different protocols. We summarize the main
projected using a 1D convolution with a kernel size of 8.                datasets used for evaluation in Table 1.
The resulting sequence is encoded using a Transformer. Fi-
nally, we follow the text encoder design from CLIP [60].                 4.1. Emergent zero-shot classification
   We use separate encoders for images, text, audio, ther-
                                                                             We evaluate I MAGE B IND on emergent zero-shot classi-
mal images, depth images, and IMU. We add a modality-
                                                                         fication and use the text prompt templates from [60] (full
specific linear projection head on each encoder to obtain a
                                                                         details in Appendix B). We report the results in Table 2.
fixed size d dimensional embedding, that is normalized and
                                                                         Each task measures I MAGE B IND’s ability to associate text
used in the InfoNCE loss from Eq 1. In addition to ease of
                                                                         embeddings to the other modalities without observing them
learning, this setup allows us to also initialize a subset of
                                                                         together during training. Given the novelty of our problem
the encoders using pretrained models, e.g., the image and
                                                                         setting, there are no “fair” baselines to compare I MAGE -
text encoder using CLIP [60] or OpenCLIP [30].
                                                                         B IND with. Nevertheless, we compare to prior work that
                                                                         uses text paired with certain modalities (e.g. audio [27, 51]),
4. Experiments
                                                                         and for certain “visual-like” modalities such as depth and
   We first describe the main experimental setup and pro-                thermal, we use the CLIP model directly. We also report
vide full details in the supplement.                                     the best reported supervised upper bound per benchmark.
Naturally paired modalities and datasets. We use I M -                       I MAGE B IND achieves a high emergent zero-shot clas-
AGE B IND on six modalities - image/video, text, audio,                  sification performance. On each benchmark, I MAGE B IND
depth, thermal images, and IMU. As described in § 3.3, we                achieves strong gains and even compares favorably to super-
treat videos as 2 frame images and process them the same                 vised specialist models trained for the specific modality and
as images. For the naturally available paired data, we use               task. These results demonstrate that I MAGE B IND aligns the
the (video, audio) pairs from the Audioset dataset [19], (im-            modalities and implicitly transfers the text supervision as-
age, depth) pairs from the SUN RGB-D dataset [69], (im-                  sociated with images to other modalities like audio. In par-
age, thermal) pairs from the LLVIP dataset [32] and (video,              ticular, I MAGE B IND shows strong alignment for non-visual
IMU) pairs from the Ego4D dataset [23]. For these pairs of               modalities like audio and IMU suggesting that their natu-
modalities, we do not use any extra supervision like class la-           rally available pairing with images is a powerful source of
bels, text etc. Since SUN RGB-D and LLVIP are relatively                 supervision. For completeness, we also report the standard
small, we follow [21] and replicate them 50× for training.               zero-shot image (ImageNet [63] - IN1K, Places-365 [87] -
Large scale image-text pairs. We leverage image-text su-                 P365) and video (Kinetics400 [35] - K400, MSR-VTT 1k-
pervision from large-scale web data [60]. For ease of ex-                A [78] - MSR-VTT) tasks. As the image & text encoders
perimentation, we use pretrained models that are trained                 are initialized (and frozen) using OpenCLIP, these results
on billions of (image, text) pairs. Specifically, we use the             match those of OpenCLIP.
                IN1K       P365     K400     MSR-VTT NYU-D SUN-D             AS-A     VGGS       ESC      LLVIP Ego4D
 Random           0.1      0.27      0.25       0.1      10.0      5.26       0.62     0.32       2.75     50.0  0.9
 I MAGE B IND    77.7      45.4      50.0      36.1      54.0      35.1       17.6     27.8       66.9     63.4  25.0
 Text Paired       -         -         -         -      41.9∗     25.4∗    28.4† [27]    -     68.6† [27]   -     -
 Absolute SOTA 91.0 [82] 60.7 [67] 89.9 [80] 57.7 [79] 76.7 [21] 64.9 [21] 49.6 [39] 52.5 [36] 97.0 [9]     -     -

Table 2. Emergent zero-shot classification of I MAGE B IND using text prompts highlighted in blue. I MAGE B IND aligns images with text,
depth, audio, thermal and IMU modalities. The resulting embedding space can associate text embeddings with the non-image modalities,
and leads to strong emergent zero-shot classification. We show strong performance even on non-visual modalities such as audio and IMU.
We compare to ‘Text Paired’ baselines wherever possible, which trains with paired text data for that modality. ∗ We use the OpenCLIP ViT-
H [30] on depth rendered as grayscale images. † [27] that uses AS class names as supervision during training, and hence is not “zero-shot”.
Overall, I MAGE B IND shows strong emergent zero-shot performance, even compared to such upper bounds. We also report the absolute
state-of-the-art (SOTA) on each dataset for reference, which typically uses additional supervision, model ensembles etc. We report the
top-1 classification accuracy for all datasets except MSR-VTT (Recall@1) and Audioset Audio-only (mAP).


                          Emergent     Clotho  AudioCaps ESC                                 Modality Emergent          MSR-VTT
                                     R@1 R@10 R@1 R@10 Top-1                                                        R@1 R@5 R@10
   Uses audio and text supervision
                                                                           MIL-NCE [49]         V           ✗        8.6 16.9 25.8
   AudioCLIP [27]             ✗                                  68.6
                                                                           SupportSet [57]      V           ✗       10.4 22.2 30.0
   Uses audio and text loss
                                                                           FIT [5]              V           ✗       15.4 33.6 44.1
   AVFIC [51]                 ✗      3.0    17.5   8.7    37.7
                                                                           AVFIC [51]          A+V          ✗       19.4 39.5 50.3
   No audio and text supervision
   I MAGE B IND               ✓      6.0    28.4   9.3    42.3   66.9       I MAGE B IND        A           ✓        6.8 18.5     27.2
   Supervised                                                               I MAGE B IND       A+V          ✗       36.8 61.8     70.0
   AVFIC finetuned [51]       ✗      8.4    38.6
   ARNLQ [53]                 ✗      12.6   45.4   24.3   72.1          Table 4. Zero-shot text based retrieval on MSR-VTT 1K-A.
                                                                        We compare I MAGE B IND’s emergent retrieval performance using
Table 3. Emergent zero-shot audio retrieval and classification.         audio and observe that it performs favorably to methods that use
We compare I MAGE B IND to prior work on zero-shot audio re-            the stronger video modality for retrieval.
trieval and audio classification. Without using audio-specific su-
pervision, I MAGE B IND outperforms prior methods on zero-shot
retrieval and has comparable performance on the classification          pervised’. I MAGE B IND’s strong performance on all three
task. I MAGE B IND’s emergent zero-shot performance approaches          benchmarks validates its ability to align the audio and text
those of specialist supervised models.                                  modalities using images as a bridge.
                                                                        Text to audio and video retrieval. We use the MSR-VTT
                                                                        1k-A benchmark to evaluate the text to audio and video re-
4.2. Comparison to prior work                                           trieval performance in Table 4. Only using audio, I MAGE -
                                                                        B IND achieves strong emergent retrieval performance com-
    We now compare I MAGE B IND against prior work in                   pared to the video retrieval performance of prior work like
zero-shot retrieval and classification tasks.                           MIL-NCE. The text to video performance for our model is
Zero-shot text to audio retrieval and classification. Un-               strong (36.1% R@1 in Table 2) as it uses OpenCLIP’s vi-
like I MAGE B IND, prior work trains using paired data for              sion and text encoders and outperforms many prior meth-
that modality, e.g., AudioCLIP [27] uses (audio, text) su-              ods. However, combining the audio and video modalities
pervision and AVFIC [52] uses automatically mined (au-                  further boosts performance showing the utility of I MAGE -
dio, text) pairs. We compare their zero-shot text to audio              B IND’s features over an already strong retrieval model.
retrieval and classification performance to I MAGE B IND’s
emergent retrieval and classification in Table 3.                       4.3. Few-shot classification
    I MAGE B IND significantly outperforms prior work on the                We now evaluate the label-efficiency of I MAGE B IND by
audio text retrieval benchmarks. On the Clotho dataset, I M -           evaluating on few-shot classification. We use the audio and
AGE B IND has double the performance of AVFIC despite not               depth encoders from I MAGE B IND and evaluate them on au-
using any text pairing for audio during training. Compared              dio and depth classification respectively in Figure 3. For
to the supervised AudioCLIP model, I MAGE B IND achieves                ≥1-shot results, we follow [50, 60] and train linear classi-
comparable audio classification performance on ESC. Note                fiers on fixed features (details in Appendix B).
that AudioCLIP uses class names from AudioSet as text                       On few-shot audio classification (Figure 3 left), we com-
targets for audio-text training, hence is referred to as ‘su-           pare with (1) self-supervised AudioMAE model trained
                                                                               40

                     80




ESC (Fold-1) Top-1
                                                                               30                                                      Chirping birds



                                                                 SUN-D Top-1
                     60

                                                                               20
                     40
                                                I MAGE B IND                                                                               Claps
                                               AudioMAE [77]                                               I MAGE B IND
                     20                                                        10
                                               Supervised [77]                                             MultiMAE [4]
                          0   1   2         4               8                       0   1   2         4              8
                                      # shots per class                                         # shots per class                      Church Bells


Figure 3. Few-shot classification on audio and depth. We report
the emergent zero-shot classification performance on each bench-                                                                      Thunderstorm

mark (denoted by ⋆). We train linear classifiers on fixed features
for the ≥ 1-shot case. (Left) In all settings, I MAGE B IND outper-                                                       Figure 4. Embedding space arithmetic where we add image
forms the self-supervised AudioMAE model. I MAGE B IND even                                                               and audio embeddings, and use them for image retrieval. The
outperforms a supervised AudioMAE model upto 4 shot learning                                                              composed embeddings naturally capture semantics from different
showing its strong generalization. (Right) We compare with the                                                            modalities. Embeddings from an image of fruits + the sound of
MultiMAE model trained with images, depth, and semantic seg-                                                              birds retrieves images of birds surrounded by fruits.
mentation masks. I MAGE B IND outperforms MultiMAE across all
few-shot settings on few-shot depth classification.


on audio from Audioset and (2) a supervised AudioMAE
model finetuned on audio classification. Both baselines
use the same capacity ViT-B audio encoder as I MAGE -
B IND. I MAGE B IND significantly outperforms the Au-
                                                                                                                             Dog barking              Sea waves   Keyboard typing   Clock alarm
dioMAE model on all settings with gains of ∼40% accuracy
in top-1 accuracy on ≤4-shot classification. I MAGE B IND                                                                 Figure 5. Object detection with audio queries. Simply replacing
also matches or outperforms the supervised model on ≥1-                                                                   Detic [88]’s CLIP-based ‘class’ embeddings with our audio em-
shot classification. I MAGE B IND’s emergent zero-shot per-                                                               beddings leads to an object detector promptable with audio. This
formance surpasses the supervised ≤2-shot performance.                                                                    requires no re-training of any model.
   For few-shot depth classification, we compare with the
multimodal MultiMAE [4] ViT-B/16 model trained on im-
ages, depth, and semantic segmentation data. I MAGE B IND                                                                 pretrained text-based detection model, Detic [88], and sim-
significantly outperforms MultiMAE across all the few-shot                                                                ply replace its CLIP-based ‘class’ (text) embeddings with
settings. Altogether, these results show the strong gener-                                                                I MAGE B IND’s audio embeddings. Without training, this
alization of I MAGE B IND audio and depth features trained                                                                creates an ‘audio’-based detector that can detect and seg-
with image alignment.                                                                                                     ment objects based on audio prompts. As shown in Fig-
                                                                                                                          ure 5, we can prompt the detector with the barking sound of
4.4. Analysis and Applications                                                                                            a dog to localize a dog.
                                                                                                                          Upgrading text-based diffusion models to audio-based.
Multimodal embedding space arithmetic. We study
                                                                                                                          We use a pretrained DALLE-2 [61] diffusion model (private
whether I MAGE B IND’s embeddings can be used to com-
                                                                                                                          reimplementation) and replace its prompt embeddings by
pose information across modalities. In Figure 4, we show
                                                                                                                          our audio embeddings. In Figure 1, we observe that we can
image retrievals obtained by adding together image and au-
                                                                                                                          repurpose the diffusion model to generate plausible images
dio embeddings. The joint embedding space allows for us to
                                                                                                                          using different types of sounds.
compose two embeddings: e.g., image of fruits on a table +
sound of chirping birds and retrieve an image that contains
both these concepts, i.e., fruits on trees with birds. Such
                                                                                                                          5. Ablation Study
emergent compositionality whereby semantic content from                                                                       We investigate various design choices for learning a joint
different modalities can be composed will likely enable a                                                                 embedding space for different modalities. Since the abla-
rich variety of compositional tasks.                                                                                      tion experimental setup is similar to § 4, we only note the
   Without re-training, we can ‘upgrade’ existing vision                                                                  main differences (full details in Appendix C). We report re-
models that use CLIP embeddings to use I MAGE B IND em-                                                                   sults on the ESC fold-1 for the ablation study. We use a ViT-
beddings from other modalities such as audio.                                                                             B encoder for the image, audio, depth, and thermal modali-
Upgrading text-based detectors to audio-based. We use a                                                                   ties by default and train them for 16 epochs (vs. 32 epochs
                                                                          temperature τ ( Eq 1) in Table 5a. We experiment with a
        50                                                                learnable temperature initialized to 0.07 (parametrized in


                                      ESC Fold-1
                                                   64                     the log-scale) following [60] vs. various values of fixed tem-
        48

NYU-D
        46                                                                peratures. Unlike [60], we observe that a fixed temperature
                                                   62                     is best for depth, audio and IMU classification. Addition-
        44
                                                                          ally, we see that a higher temperature is better for train-
         ViT-B ViT-L    ViT-H                       ViT-B ViT-L   ViT-H
                                                                          ing the depth, thermal, and IMU encoders, whereas a lower
        62                                     24                         temperature works best for the audio modality.
                                               22                         Projection head. We vary the projection head used for each
LLVIP                              Ego4D
        60                                     20                         encoder from a linear layer to an MLP with 768 hidden di-
                                               18                         mensions. The results in Table 5b show that a linear pro-
        58
         ViT-B ViT-L    ViT-H                      ViT-B ViT-L    ViT-H   jection performs better for both modalities. This is in con-
                                                                          trast to standard self-supervised methods like SimCLR [10]
Figure 6. Scaling the image encoder size while keeping the other          whose performance improves with MLP projection heads.
modality encoders’ size fixed. We measure the performance on              Training epochs. We vary the number training epochs and
the emergent zero-shot classification of depth, audio, thermal, and       report the classification performance in Table 5c. Longer
IMU modalities. Scaling the image encoder significantly improves
                                                                          training consistently improves the emergent zero-shot per-
the zero-shot classification results suggesting that a stronger visual
representation improves the ‘binding’ of modalities.
                                                                          formance for both modalities across all datasets.
                                                                          Data augmentation for paired images. During I M -
                                                                          AGE B IND training, we augment images either using ba-
in § 4). For IMU we use a lightweight 6 layer encoder                     sic augmentation (cropping, color jitter) or strong aug-
with 512 dimensional width and 8 heads, and train it for 8                mentation that additionally applies RandAugment [12] and
epochs. The text encoder follows [60] and is a twelve layer               RandErase [86]. We specify the augmentation parameters
Transformer with a width of 512 dimensions. We initialize                 in Appendix C. Stronger augmentation helps depth classifi-
the image and text encoder from the CLIP model [60].                      cation when training on the small number of (image, depth)
                                                                          pairs from the SUN RGB-D dataset. However, for audio,
5.1. Scaling the Image Encoder                                            strongly augmenting the video makes the task too challeng-
   The central idea in I MAGE B IND is aligning the embed-                ing, leading to a significant drop of 34% on ESC.
dings of all modalities to image embeddings. Thus, the im-                Depth specific design choices. We vary the type of spatial
age embeddings plays a central role in the emergent align-                crops used for training in Table 5e. Following CMC [70],
ment of unseen modalities and we study their effect on the                we use two unaligned random crops from the correspond-
emergent zero-shot performance. We vary the size of the                   ing image and depth pair vs. our default choice of using
image encoder and train an encoder for the depth, audio                   spatially aligned random crops. Contrary to CMC, we ob-
etc. modalities to match the image representation. To iso-                serve that random cropping severely degrades performance:
late the effect of the image representation, we fix the size              more than 10% on SUN-D. Unlike vanilla self-supervised
of the other modality encoders. We use the pretrained CLIP                learning, our image representations learned from image-
(ViT-B and ViT-L) and OpenCLIP (ViT-H) image and text                     text pairs are more semantic and thus spatially misaligned
encoders for this experiment. Our results in Figure 6 show                crops hurt performance. In Table 5f, we observe that Ran-
that I MAGE B IND’s emergent zero-shot performance on all                 domErase [86] boosts performance on depth classification.
modalities improves with better visual features. For depth                Audio specific design choices. We train for video-audio
and audio classification, the stronger ViT-H vs. the ViT-B                alignment using temporally aligned samples or unaligned
image encoder, provides a gain of 7% and 4% respectively.                 samples and measure the final performance in Table 5g.
Thus, stronger visual features can improve recognition per-               Similar to the depth classification observation, temporally
formance even on non-visual modalities.                                   aligned samples lead to better performance. Table 5h shows
                                                                          that using frequency masking augmentation for audio also
5.2. Training Loss and Architecture                                       provides a small boost in performance.
    We study the effect of the training design choices on the             Capacity of the audio and depth encoders and their im-
emergent zero-shot classification. We focus on two modali-                pact of the classification performance is reported in Table 6.
ties with different characteristics - depth which is visual and           A smaller encoder for depth improves performance pre-
spatial, and audio which is non-visual and has a temporal                 sumably because of the relatively small size of the (image,
component. We found that studying these diverse modali-                   depth) dataset. Conversely, we observe that larger audio en-
ties led to robust and transferable design decisions.                     coder improves the performance, particularly when paired
Contrastive loss temperature. We study the effect of the                  with a high capacity image encoder.
 Temp → Learn 0.05 0.07 0.2 1.0              Proj head → Linear MLP            Epochs → 16     32   64             Data aug → Basic Strong
  SUN-D 24.1 27.0 27.3 26.7 28.0               SUN-D      26.7 26.5             SUN-D    26.7 27.9 29.9              SUN-D      25.4   26.7
   ESC  54.8 56.7 52.4 45.4 24.3                ESC       56.7 51.0              ESC     56.7 61.3 62.9               ESC       56.7   22.6
     (a) Temperature for loss.                 (b) Projection Head.             (c) Training epochs.               (d) Data aug for image.
    Spatial align → None Aligned            Data aug → None RandErase       Temporal align→ None Aligned         Data aug → Basic +Freq mask
        SUN-D       16.0    26.7             SUN-D     24.2     26.7              ESC        55.7   56.7             ESC      56.5     56.7
   (e) Spatial alignment of depth.             (f) Depth data aug.        (g) Temporal alignment of audio.           (h) Audio data aug.

Table 5. Training loss and architecture design decisions and their impact on emergent zero-shot classification. Settings for results in § 4
highlighted in gray. (a) A fixed temperature in the contrastive loss outperforms a learnable one for all modalities. (b) A linear projection
head for computing the depth or audio embedding works better than an MLP head. (c) Longer training improves the zero-shot classification
performance for both modalities. (d) Stronger image augmentation improves depth classification while basic augmentation significantly
improves audio classification. (e, f) Using spatially aligned image and depth crops when training I MAGE B IND significantly improves
performance. Similarly, RandErase augmentation is critical to good zero-shot classification on depth. (g, h) Temporally aligned audio and
video matching gives improved performance and using frequency augmentation for audio gives a slight improvement.


               Audio Encoder (ESC) Depth Encoder (SUN)                                   IN1K VGGS ESC SUN-D NYU-D
 Image Encoder ViT-S     ViT-B     ViT-S     ViT-B                             DINO [6] 64.4 17.2 44.7 26.8   48.8
     ViT-B     52.8       56.7     30.7       26.7                             DeiT [72] 74.4† 9.6 25.0 25.2  48.0
    ViT-H      54.8       60.3     33.3       29.5
                                                                         Table 8. I MAGE B IND as an evaluation tool. We initialize (and
Table 6. Capacity of the audio and depth encoders and their              fix) the image encoder with different methods and align other
impact on performance. A stronger image encoder improves per-            modalities. I MAGE B IND measures the impact of visual features
formance for both audio and depth tasks. As the number of (image,        on multimodal tasks. † trained with IN1K supervision.
depth) pairs is small, a smaller encoder improves performance for
depth. For audio classification, a larger encoder is better.

         Batch size →        512      1k       2k       4k               6. Discussion and Limitations
           NYU-D             47.3    46.5     43.0     39.9
             ESC             39.4    53.9     56.7     53.9                 I MAGE B IND is a simple and practical way to train a joint
                                                                         embedding space using only image alignment. Our method
Table 7. Effect of scaling batch size. We found the optimal batch        leads to emergent alignment across all modalities which
size for contrastive loss varied by the modality. For image-depth        can be measured using cross-modal retrieval and text-based
task, a smaller batch size was better, likely due to the small size      zero-shot tasks. We enable a rich set of compositional mul-
and limited diversity of the original dataset. For audio-video task      timodal tasks across different modalities, show a way to
where we have a lot more positive and negative audio-video pairs,        evaluate pretrained vision models for non-vision tasks and
using a large batch size lead to better results.                         ‘upgrade’ models like Detic and DALLE-2 to use using au-
                                                                         dio. There are multiple ways to further improve I MAGE -
Effect of batch size. In Table 7 we evaluate the effect of               B IND. Our image alignment loss can be enriched by using
batch size on the representation learned. As shown, the                  other alignment data, for instance other modalities paired
batch size can vary across modalities depending on the size              with text, or with each other (e.g. audio with IMU). Our
and complexity of the corresponding pretraining datasets.                embeddings are trained without a specific downstream task,
                                                                         and thus lag the performance of specialist models. More re-
I MAGE B IND to evaluate pretrained vision models in Ta-
                                                                         search into adapting general purpose embeddings for each
ble 8. We initialize the vision encoder using a pretrained
                                                                         task, including structured prediction tasks such as detection
model and keep it fixed. We use image-paired data to align
                                                                         will be beneficial. Finally, new benchmarks, e.g. our emer-
and train text, audio, and depth encoders (full details in Ap-
                                                                         gent zero-shot task to measure emergent abilities of multi-
pendix B). Compared to the supervised DeiT model, the
                                                                         modal models, would help create exciting new applications.
self-supervised DINO model is better at emergent zero-shot
                                                                         Our model is a research prototype and cannot be readily
classification on both depth and audio modalities. More-
                                                                         used for real world applications ( Appendix F).
over, the emergent zero-shot performance is not correlated
with the pure vision performance on ImageNet suggest-                    Acknowledgements: Authors would like to thank Uriel
ing that these tasks measure different properties. I MAGE -              Singer, Adam Polyak and Naman Goyal for their help with
B IND can serve as a valuable tool to measure vision models’             the DALLE-2 experiments, and the entire Meta AI team for
strength on multimodal applications.                                     many helpful discussions.
References                                                              arXiv preprint arXiv:2106.11097, 2021. 2
                                                                   [16] Christoph Feichtenhofer, Haoqi Fan, Yanghao Li, and Kaim-
 [1] Jean-Baptiste Alayrac, Jeff Donahue, Pauline Luc, An-              ing He. Masked autoencoders as spatiotemporal learners. In
     toine Miech, Iain Barr, Yana Hasson, Karel Lenc, Arthur            NeurIPS, 2022. 13
     Mensch, Katie Millican, Malcolm Reynolds, Roman Ring,         [17] Frederic Font, Gerard Roma, and Xavier Serra. Freesound
     Eliza Rutherford, Serkan Cabi, Tengda Han, Zhitao Gong,            technical demo. In ACM MM, 2013. 4, 12
     Sina Samangooei, Marianne Monteiro, Jacob Menick, Se-         [18] Andrea Frome, Greg S Corrado, Jon Shlens, Samy Bengio,
     bastian Borgeaud, Andrew Brock, Aida Nematzadeh, Sa-               Jeff Dean, Marc’Aurelio Ranzato, and Tomas Mikolov. De-
     hand Sharifzadeh, Mikolaj Binkowski, Ricardo Barreira,             vise: A deep visual-semantic embedding model. NeurIPS,
     Oriol Vinyals, Andrew Zisserman, and Karen Simonyan.               2013. 2
     Flamingo: a visual language model for few-shot learning.      [19] Jort F. Gemmeke, Daniel P. W. Ellis, Dylan Freedman, Aren
     In NeurIPS, 2022. 1, 2                                             Jansen, Wade Lawrence, R. Channing Moore, Manoj Plakal,
 [2] Jean-Baptiste Alayrac, Adria Recasens, Rosalia Schneider,          and Marvin Ritter. Audio set: An ontology and human-
     Relja Arandjelovic, Jason Ramapuram, Jeffrey De Fauw, Lu-          labeled dataset for audio events. In ICASSP, 2017. 4, 12
     cas Smaira, Sander Dieleman, and Andrew Zisserman. Self-      [20] Rohit Girdhar, Alaaeldin El-Nouby, Mannat Singh,
     supervised multimodal versatile networks. NeurIPS, 2020.           Kalyan Vasudev Alwala, Armand Joulin, and Ishan Misra.
     2                                                                  OmniMAE: Single Model Masked Pretraining on Images
 [3] Relja Arandjelovic and Andrew Zisserman. Look, listen and          and Videos. In CVPR, 2023. 2, 3
     learn. In ICCV, 2017. 1, 2                                    [21] Rohit Girdhar, Mannat Singh, Nikhila Ravi, Laurens van der
 [4] Roman Bachmann, David Mizrahi, Andrei Atanov, and Amir             Maaten, Armand Joulin, and Ishan Misra. Omnivore: A Sin-
     Zamir. MultiMAE: Multi-modal Multi-task Masked Autoen-             gle Model for Many Visual Modalities. In CVPR, 2022. 2,
     coders. In ECCV, 2022. 1, 6                                        4, 5, 12
 [5] Max Bain, Arsha Nagrani, Gül Varol, and Andrew Zisser-       [22] Yuan Gong, Yu-An Chung, and James Glass. AST: Audio
     man. Frozen in time: A joint video and image encoder for           Spectrogram Transformer. In Interspeech, 2021. 3, 4, 13
     end-to-end retrieval. In ICCV, 2021. 5                        [23] Kristen Grauman, Andrew Westbury, Eugene Byrne,
 [6] Mathilde Caron, Hugo Touvron, Ishan Misra, Hervé Jégou,          Zachary Chavis, Antonino Furnari, Rohit Girdhar, Jackson
     Julien Mairal, Piotr Bojanowski, and Armand Joulin. Emerg-         Hamburger, Hao Jiang, Miao Liu, Xingyu Liu, Miguel Mar-
     ing properties in self-supervised vision transformers. In          tin, Tushar Nagarajan, Ilija Radosavovic, Santhosh Kumar
     ICCV, 2021. 8                                                      Ramakrishnan, Fiona Ryan, Jayant Sharma, Michael Wray,
 [7] João Carreira and Andrew Zisserman. Quo vadis, action             Mengmeng Xu, Eric Zhongcong Xu, Chen Zhao, Siddhant
     recognition? A new model and the kinetics dataset. In CVPR,        Bansal, Dhruv Batra, Vincent Cartillier, Sean Crane, Tien
     2017. 3                                                            Do, Morrie Doulaty, Akshay Erapalli, Christoph Feichten-
 [8] Honglie Chen, Weidi Xie, Andrea Vedaldi, and Andrew Zis-           hofer, Adriano Fragomeni, Qichen Fu, Abrham Gebrese-
     serman. Vggsound: A large-scale audio-visual dataset. In           lasie, Cristina Gonzalez, James Hillis, Xuhua Huang, Yifei
     ICASSP, 2020. 4, 12                                                Huang, Wenqi Jia, Weslie Khoo, Jachym Kolar, Satwik Kot-
 [9] Ke Chen, Xingjian Du, Bilei Zhu, Zejun Ma, Taylor Berg-            tur, Anurag Kumar, Federico Landini, Chao Li, Yanghao
     Kirkpatrick, and Shlomo Dubnov. Hts-at: A hierarchical             Li, Zhenqiang Li, Karttikeya Mangalam, Raghava Modhugu,
     token-semantic audio transformer for sound classification          Jonathan Munro, Tullie Murrell, Takumi Nishiyasu, Will
     and detection. In ICASSP, 2022. 5                                  Price, Paola Ruiz Puentes, Merey Ramazanova, Leda Sari,
[10] Ting Chen, Simon Kornblith, Mohammad Norouzi, and Ge-
                                                                        Kiran Somasundaram, Audrey Southerland, Yusuke Sugano,
     offrey Hinton. A simple framework for contrastive learning
                                                                        Ruijie Tao, Minh Vo, Yuchen Wang, Xindi Wu, Takuma
     of visual representations. In ICML, 2020. 7, 14
                                                                        Yagi, Ziwei Zhao, Yunyi Zhu, Pablo Arbelaez, David Cran-
[11] Mehdi Cherti, Romain Beaumont, Ross Wightman, Mitchell
                                                                        dall, Dima Damen, Giovanni Maria Farinella, Christian Fue-
     Wortsman, Gabriel Ilharco, Cade Gordon, Christoph Schuh-
                                                                        gen, Bernard Ghanem, Vamsi Krishna Ithapu, C. V. Jawahar,
     mann, Ludwig Schmidt, and Jenia Jitsev. Reproducible scal-
                                                                        Hanbyul Joo, Kris Kitani, Haizhou Li, Richard Newcombe,
     ing laws for contrastive language-image learning. In CVPR,
                                                                        Aude Oliva, Hyun Soo Park, James M. Rehg, Yoichi Sato,
     2023. 4
[12] Ekin D Cubuk, Barret Zoph, Jonathon Shlens, and Quoc V             Jianbo Shi, Mike Zheng Shou, Antonio Torralba, Lorenzo
     Le. Randaugment: Practical automated data augmentation             Torresani, Mingfei Yan, and Jitendra Malik. Ego4d: Around
     with a reduced search space. In CVPR, 2020. 7                      the world in 3,000 hours of egocentric video. In CVPR, 2022.
[13] Alexey Dosovitskiy, Lucas Beyer, Alexander Kolesnikov,             4, 12
     Dirk Weissenborn, Xiaohua Zhai, Thomas Unterthiner,           [24] Xiuye Gu, Tsung-Yi Lin, Weicheng Kuo, and Yin Cui.
     Mostafa Dehghani, Matthias Minderer, Georg Heigold, Syl-           Open-vocabulary object detection via vision and language
     vain Gelly, et al. An image is worth 16x16 words: Trans-           knowledge distillation. In ICLR, 2022. 2
                                                                   [25] Saurabh Gupta, Pablo Arbelaez, and Jitendra Malik. Per-
     formers for image recognition at scale. In ICLR, 2021. 3
[14] Fartash Faghri, David J Fleet, Jamie Ryan Kiros, and Sanja         ceptual organization and recognition of indoor scenes from
     Fidler. VSE++: Improving Visual-Semantic Embeddings                rgb-d images. In CVPR, 2013. 13
                                                                   [26] Saurabh Gupta, Ross Girshick, Pablo Arbeláez, and Jitendra
     with Hard Negatives. In BMVC, 2018. 2
[15] Han Fang, Pengfei Xiong, Luhui Xu, and Yu Chen.                    Malik. Learning rich features from rgb-d images for object
     Clip2video: Mastering video-text retrieval via image clip.         detection and segmentation. In ECCV, 2014. 13
[27] Andrey Guzhov, Federico Raue, Jörn Hees, and Andreas                2022. 2
     Dengel. AudioCLIP: Extending CLIP to Image, Text and            [44] Xingbin Liu, Jinghao Zhou, Tao Kong, Xianming Lin, and
     Audio. arXiv preprint arXiv:2106.13043, 2021. 2, 3, 4, 5             Rongrong Ji. Exploring target representations for masked
[28] Raia Hadsell, Sumit Chopra, and Yann LeCun. Dimension-               autoencoders. arXiv preprint arXiv:2209.03917, 2022. 2
     ality reduction by learning an invariant mapping. In CVPR,      [45] Huaishao Luo, Lei Ji, Ming Zhong, Yang Chen, Wen Lei,
     2006. 3                                                              Nan Duan, and Tianrui Li. CLIP4Clip: An Empirical Study
[29] Gao Huang, Yu Sun, Zhuang Liu, Daniel Sedra, and Kilian Q            of CLIP for End to End Video Clip Retrieval. arXiv preprint
     Weinberger. Deep networks with stochastic depth. In ECCV,            arXiv:2104.08860, 2021. 2
     2016. 14                                                        [46] Dhruv Mahajan, Ross Girshick, Vignesh Ramanathan,
[30] Gabriel Ilharco, Mitchell Wortsman, Ross Wightman, Cade              Kaiming He, Manohar Paluri, Yixuan Li, Ashwin Bharambe,
     Gordon, Nicholas Carlini, Rohan Taori, Achal Dave,                   and Laurens Van Der Maaten. Exploring the limits of weakly
     Vaishaal Shankar, Hongseok Namkoong, John Miller, Han-               supervised pretraining. In ECCV, 2018. 1
     naneh Hajishirzi, Ali Farhadi, and Ludwig Schmidt. Open-        [47] Antoine Miech, Jean-Baptiste Alayrac, Lucas Smaira, Ivan
     clip, 2021. 4, 5                                                     Laptev, Josef Sivic, and Andrew Zisserman. End-to-end
[31] Chao Jia, Yinfei Yang, Ye Xia, Yi-Ting Chen, Zarana Parekh,          learning of visual representations from uncurated instruc-
     Hieu Pham, Quoc Le, Yun-Hsuan Sung, Zhen Li, and Tom                 tional videos. In CVPR, 2020. 2
     Duerig. Scaling up visual and vision-language representation    [48] Antoine Miech, Dimitri Zhukov, Jean-Baptiste Alayrac,
     learning with noisy text supervision. In ICML, 2021. 1, 2            Makarand Tapaswi, Ivan Laptev, and Josef Sivic.
[32] Xinyu Jia, Chuang Zhu, Minzhen Li, Wenqi Tang, and Wenli             Howto100m: Learning a text-video embedding by watching
     Zhou. Llvip: A visible-infrared paired dataset for low-light         hundred million narrated video clips. ICCV, 2019. 2
     vision. In ICCV, 2021. 4, 12, 13                                [49] Antoine Miech, Dimitri Zhukov, Jean-Baptiste Alayrac,
[33] Melvin Johnson, Mike Schuster, Quoc V Le, Maxim Krikun,              Makarand Tapaswi, Ivan Laptev, and Josef Sivic.
     Yonghui Wu, Zhifeng Chen, Nikhil Thorat, Fernanda Viégas,           Howto100m: Learning a text-video embedding by watching
     Martin Wattenberg, Greg Corrado, Macduff Hughes, and Jef-            hundred million narrated video clips. In ICCV, 2019. 5
     frey Dean. Google’s multilingual neural machine translation     [50] Pedro Morgado, Nuno Vasconcelos, and Ishan Misra. Audio-
     system: Enabling zero-shot translation. In ACL, 2017. 2              visual instance discrimination with cross-modal agreement.
[34] Armand Joulin, Laurens van der Maaten, Allan Jabri, and              In CVPR, 2021. 1, 2, 3, 5
     Nicolas Vasilache. Learning visual features from large          [51] Arsha Nagrani, Paul Hongsuck Seo, Bryan Seybold, Anja
     weakly supervised data. In ECCV, 2016. 2                             Hauth, Santiago Manen, Chen Sun, and Cordelia Schmid.
[35] Will Kay, Joao Carreira, Karen Simonyan, Brian Zhang,                Learning audio-video modalities from image captions. In
     Chloe Hillier, Sudheendra Vijayanarasimhan, Fabio Viola,             ECCV, 2022. 2, 4, 5
     Tim Green, Trevor Back, Paul Natsev, Mustafa Suleyman,          [52] Arsha Nagrani, Shan Yang, Anurag Arnab, Aren Jansen,
     and Andrew Zisserman. The kinetics human action video                Cordelia Schmid, and Chen Sun. Attention bottlenecks for
     dataset. arXiv preprint arXiv:1705.06950, 2017. 4                    multimodal fusion. In NeurIPS, 2021. 5
[36] Evangelos Kazakos, Arsha Nagrani, Andrew Zisserman, and         [53] Andreea-Maria Oncescu, A Koepke, Joao F Henriques,
     Dima Damen. Slow-fast auditory streams for audio recogni-            Zeynep Akata, and Samuel Albanie. Audio retrieval with
     tion. In ICASSP, 2021. 5                                             natural language queries. In Interspeech, 2021. 5, 12
[37] Chris Dongjoo Kim, Byeongchang Kim, Hyunmin Lee, and            [54] Aaron van den Oord, Yazhe Li, and Oriol Vinyals. Rep-
     Gunhee Kim. Audiocaps: Generating captions for audios in             resentation learning with contrastive predictive coding. In
     the wild. In NAACL, 2019. 4, 12                                      NeurIPS, 2018. 3
[38] Ryan Kiros, Ruslan Salakhutdinov, and Richard S Zemel.          [55] Andrew Owens and Alexei A Efros. Audio-visual scene
     Unifying visual-semantic embeddings with multimodal neu-             analysis with self-supervised multisensory features. In
     ral language models. In NeurIPS Workshop, 2014. 2                    ECCV, 2018. 1
[39] Khaled Koutini, Jan Schlüter, Hamid Eghbal-zadeh, and Ger-     [56] Mandela Patrick, Yuki M Asano, Ruth Fong, João F Hen-
     hard Widmer. Efficient training of audio transformers with           riques, Geoffrey Zweig, and Andrea Vedaldi. Multi-modal
     patchout. In Interspeech, 2022. 5                                    self-supervision from generalized data transformations. In
[40] Guillaume Lample, Alexis Conneau, Ludovic Denoyer, and               ICCV, 2021. 1
     Marc’Aurelio Ranzato. Unsupervised machine translation          [57] Mandela Patrick, Po-Yao Huang, Yuki Asano, Florian
     using monolingual corpora only. In ICLR, 2018. 2                     Metze, Alexander Hauptmann, Joao Henriques, and Andrea
[41] Boyi Li, Kilian Q Weinberger, Serge Belongie, Vladlen                Vedaldi. Support-set bottlenecks for video-text representa-
     Koltun, and René Ranftl. Language-driven semantic seg-              tion learning. In ICLR, 2021. 5
     mentation. In ICLR, 2022. 2                                     [58] Zhiliang Peng, Li Dong, Hangbo Bao, Qixiang Ye,
[42] Valerii Likhosherstov, Anurag Arnab, Krzysztof Choroman-             and Furu Wei.        BEiT v2: Masked image modeling
     ski, Mario Lucic, Yi Tay, Adrian Weller, and Mostafa De-             with vector-quantized visual tokenizers. arXiv preprint
     hghani. Polyvit: Co-training vision transformers on images,          arXiv:2208.06366, 2022. 2
     videos and audio. arXiv preprint arXiv:2111.12993, 2021. 2      [59] Karol J Piczak. Esc: Dataset for environmental sound clas-
[43] Ziyi Lin, Shijie Geng, Renrui Zhang, Peng Gao, Gerard de             sification. In ACM MM, 2015. 4, 12
     Melo, Xiaogang Wang, Jifeng Dai, Yu Qiao, and Hongsheng         [60] Alec Radford, Jong Wook Kim, Chris Hallacy, Aditya
     Li. Frozen clip models are efficient video learners. In ECCV,        Ramesh, Gabriel Goh, Sandhini Agarwal, Girish Sastry,
     Amanda Askell, Pamela Mishkin, Jack Clark, et al. Learn-              and Lu Yuan. BEVT: Bert pretraining of video transformers.
     ing transferable visual models from natural language super-           In CVPR, 2022. 2
     vision. In ICML, 2021. 1, 2, 3, 4, 5, 7, 13, 14, 15              [75] Yixuan Wei, Han Hu, Zhenda Xie, Zheng Zhang, Yue Cao,
[61] Aditya Ramesh, Prafulla Dhariwal, Alex Nichol, Casey Chu,             Jianmin Bao, Dong Chen, and Baining Guo. Contrastive
     and Mark Chen. Hierarchical text-conditional image gen-               learning rivals masked image modeling in fine-tuning via
     eration with clip latents. arXiv preprint arXiv:2204.06125,           feature distillation. arXiv preprint arXiv:2205.14141, 2022.
     2022. 1, 6, 13                                                        2
[62] René Ranftl, Katrin Lasinger, David Hafner, Konrad              [76] Zhirong Wu, Yuanjun Xiong, Stella X Yu, and Dahua Lin.
     Schindler, and Vladlen Koltun. Towards robust monocular               Unsupervised feature learning via non-parametric instance
     depth estimation: Mixing datasets for zero-shot cross-dataset         discrimination. In CVPR, 2018. 3
     transfer. TPAMI, 2020. 13                                        [77] Hu Xu, Juncheng Li, Alexei Baevski, Michael Auli, Woj-
[63] Olga Russakovsky, Jia Deng, Hao Su, Jonathan Krause, San-             ciech Galuba, Florian Metze, and Christoph Feichtenhofer.
     jeev Satheesh, Sean Ma, Zhiheng Huang, Andrej Karpathy,               Masked autoencoders that listen. In NeurIPS, 2022. 6
     Aditya Khosla, Michael Bernstein, Alexander C. Berg, and         [78] Jun Xu, Tao Mei, Ting Yao, and Yong Rui. Msr-vtt: A large
     Li Fei-Fei. ImageNet Large Scale Visual Recognition Chal-             video description dataset for bridging video and language. In
     lenge. IJCV, 2015. 4                                                  CVPR, 2016. 4
[64] Christoph Schuhmann, Romain Beaumont, Richard Vencu,             [79] Hongwei Xue, Yuchong Sun, Bei Liu, Jianlong Fu, Ruihua
     Cade Gordon, Ross Wightman, Mehdi Cherti, Theo                        Song, Houqiang Li, and Jiebo Luo. CLIP-ViP: Adapting Pre-
     Coombes, Aarush Katta, Clayton Mullis, Mitchell Worts-                trained Image-Text Model to Video-Language Representa-
     man, Patrick Schramowski, Srivatsa Kundurthy, Katherine               tion Alignment. In ICLR, 2023. 2, 5
     Crowson, Ludwig Schmidt, Robert Kaczmarczyk, and Jenia           [80] Shen Yan, Xuehan Xiong, Anurag Arnab, Zhichao Lu, Mi
     Jitsev. LAION-5B: An open large-scale dataset for training            Zhang, Chen Sun, and Cordelia Schmid. Multiview trans-
     next generation image-text models. In NeurIPS Datasets and            formers for video recognition. In CVPR, 2022. 5
     Benchmarks, 2022. 1                                              [81] Kim Youwang, Kim Ji-Yeon, and Tae-Hyun Oh. Clip-actor:
[65] Christoph Schuhmann, Richard Vencu, Romain Beaumont,                  Text-driven recommendation and stylization for animating
     Robert Kaczmarczyk, Clayton Mullis, Aarush Katta, Theo                human meshes. In ECCV, 2022. 2
     Coombes, Jenia Jitsev, and Aran Komatsuzaki. Laion-400m:         [82] Jiahui Yu, Zirui Wang, Vijay Vasudevan, Legg Yeung, Mo-
     Open dataset of clip-filtered 400 million image-text pairs. In        jtaba Seyedhosseini, and Yonghui Wu. Coca: Contrastive
     NeurIPS Workshop, 2021. 1                                             captioners are image-text foundation models. TMLR, 2022.
[66] Nathan Silberman, Derek Hoiem, Pushmeet Kohli, and Rob                1, 2, 5
     Fergus. Indoor segmentation and support inference from           [83] Lu Yuan, Dongdong Chen, Yi-Ling Chen, Noel Codella,
     rgbd images. In ECCV, 2012. 4, 12, 13                                 Xiyang Dai, Jianfeng Gao, Houdong Hu, Xuedong Huang,
[67] Mannat Singh, Laura Gustafson, Aaron Adcock, Vinicius                 Boxin Li, Chunyuan Li, Ce Liu, Mengchen Liu, Zicheng Liu,
     de Freitas Reis, Bugra Gedik, Raj Prateek Kosaraju, Dhruv             Yumao Lu, Yu Shi, Lijuan Wang, Jianfeng Wang, Bin Xiao,
     Mahajan, Ross Girshick, Piotr Dollár, and Laurens van der            Zhen Xiao, Jianwei Yang, Michael Zeng, Luowei Zhou, and
     Maaten. Revisiting weakly supervised pre-training of visual           Pengchuan Zhang. Florence: A new foundation model for
     perception models. In CVPR, 2022. 5                                   computer vision. arXiv preprint arXiv:2111.11432, 2021. 1,
[68] Richard Socher, Andrej Karpathy, Quoc V Le, Christopher D             2
     Manning, and Andrew Y Ng. Grounded compositional se-             [84] Xiaohua Zhai, Xiao Wang, Basil Mustafa, Andreas Steiner,
     mantics for finding and describing images with sentences.             Daniel Keysers, Alexander Kolesnikov, and Lucas Beyer.
     ACL, 2014. 2                                                          Lit: Zero-shot transfer with locked-image text tuning. In
[69] Shuran Song, Samuel P Lichtenberg, and Jianxiong Xiao.                CVPR, 2022. 2
     Sun rgb-d: A rgb-d scene understanding benchmark suite. In       [85] Renrui Zhang, Ziyu Guo, Wei Zhang, Kunchang Li, Xu-
     CVPR, 2015. 4, 12                                                     peng Miao, Bin Cui, Yu Qiao, Peng Gao, and Hongsheng
[70] Yonglong Tian, Dilip Krishnan, and Phillip Isola. Con-                Li. Pointclip: Point cloud understanding by clip. In CVPR,
     trastive multiview coding. arXiv preprint arXiv:1906.05849,           2022. 2, 3
     2019. 1, 2, 3, 7                                                 [86] Zhun Zhong, Liang Zheng, Guoliang Kang, Shaozi Li, and
[71] Zhan Tong, Yibing Song, Jue Wang, and Limin Wang.                     Yi Yang. Random erasing data augmentation. In AAAI, 2020.
     Videomae: Masked autoencoders are data-efficient learners             7
     for self-supervised video pre-training. In NeurIPS, 2022. 13     [87] Bolei Zhou, Agata Lapedriza, Jianxiong Xiao, Antonio Tor-
[72] Hugo Touvron, Matthieu Cord, Matthijs Douze, Francisco                ralba, and Aude Oliva. Learning deep features for scene
     Massa, Alexandre Sablayrolles, and Hervé Jégou. Training            recognition using places database. In NeurIPS, 2014. 4
     data-efficient image transformers & distillation through at-     [88] Xingyi Zhou, Rohit Girdhar, Armand Joulin, Philipp
     tention. In ICML, 2021. 8                                             Krähenbühl, and Ishan Misra. Detecting twenty-thousand
[73] Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszko-               classes using image-level supervision. In ECCV, 2022. 2, 6,
     reit, Llion Jones, Aidan N Gomez, Lukasz Kaiser, and Illia            13
     Polosukhin. Attention is all you need. In NeurIPS, 2017. 3
[74] Rui Wang, Dongdong Chen, Zuxuan Wu, Yinpeng Chen,
     Xiyang Dai, Mengchen Liu, Yu-Gang Jiang, Luowei Zhou,
A. Datasets and Metrics                                                   depth values and 2) convert them to disparity for scale nor-
                                                                          malization. This dataset is only used in training, so we do
Audioset (AS) [19]. This dataset is used for both training                not use any metadata or class labels.
and evaluation. It contains 10s videos from YouTube anno-
                                                                          SUN Depth-only (SUN-D). We use only the ∼5K depth
tated into 527 classes. It consists of 3 pre-defined splits, the
                                                                          maps from the val split of the SUN RGB-D [69] dataset
balanced split with about 20K videos, test split with 18K
                                                                          and denote them as SUN Depth-only. This dataset is only
videos, and an unbalanced training split with about 2M vi-
                                                                          used for evaluation and we do not use the RGB images. We
does. For training, we use the 2M unbalanced set without
                                                                          process the depth maps similar to SUN RGB-D (in-filled
any labels, and only use it for audio-video matching. For
                                                                          depth, converted to disparity). We use the 19 scene classes
zero-shot evaluation in Table 2, we use the test set and
                                                                          in the dataset and use their class names for constructing the
compute logits for each class using the textual class names
                                                                          zero-shot classification templates.
along with the templates as described later in Appendix B.3.
The metric used is top-1 accuracy.                                        NYU-v2 Depth-only (NYU-D). We use the 794 val set
ESC-50 (ESC) [59]. We use this dataset for evaluating the                 depth maps from the NYU-v2 Depth-only [66] dataset
learned representations in a zero-shot manner. The task here              for evaluation only. We post-process the depth similar to
is “Environmental Sound Classification” (ESC). It consists                SUN Depth-only. We use the 10 scene class names in the
of 2000 5s audio clips classified into 50 classes. It has pre-            dataset. The 10th scene class, called ‘other’, correspond to
defined 5 fold evaluation, each consisting of 400 test audio              18 different semantic classes – [’basement’, ’cafe’,
clips. In this work, we compute 0-shot predictions on the                 ’computer lab’, ’conference room’, ’dinette’,
evaluation set for each fold and report the 5-fold average                ’exercise room’, ’foyer’, ’furniture store’,
performance. For ablations we use only the first fold for                 ’home storage’, ’indoor balcony’, ’laundry
computational ease. The metric used is top-1 accuracy.                    room’, ’office kitchen’, ’playroom’, ’printer
Clotho (Clotho) [17]. This is a dataset of audio from the                 room’, ’reception room’, ’student lounge’,
Freesound platform with textual descriptions. It consists of              ’study’, ’study room’].  For zero-shot evaluation,
a dev and test set of 2893 and 1045 audio clips respectively,             we compute the cosine similarity of the 10th class as the
with each clip associated with 5 descriptions. We consider                maximum cosine similarity among these 18 classnames.
the text→audio retrieval task, and consider each of the 5 as-             LLVIP (LLVIP). The LLVIP dataset [32] consists of RGB
sociated captions as a separate test query and retrieve from              image and Thermal (infrared low-light) image pairs. The
the set of audio clips. The metric used is recall@K, where                dataset was collected in an outdoor setting using fixed cam-
a given test query is assumed to be correctly solved if the               eras observing street scenes and contains RGB images taken
ground truth audio is retrieved within the top-K retrieved                in a low-light paired with infrared images (8∼14um fre-
audio clips.                                                              quency). The RGB thermal pairs are registered in the
AudioCaps (AudioCaps) [37]. This is a dataset of audio-                   dataset release. For training, we use the train set with
visual clips from YouTube accompanied by textual descrip-                 12025 RGB image and thermal pairs. For evaluation,
tions. It consists of clips from the Audioset dataset as de-              we use the val set with 3463 pairs of RGB and ther-
scribed earlier. We use the splits as provided in [53],1 which            mal images. Since the original dataset is designed for
removes clips that overlap with the VGGSound dataset. We                  detection, we post process it for a binary classification
end up with 48198 training, 418 validation and 796 test                   task. We crop out pedestrian bounding boxes and ran-
clips. We only use the test set for zero-shot evaluation of               dom bounding boxes (same aspect ratio and size as pedes-
our model. The task is text→audio retrieval, and evaluation               trian) to create a balanced set of 15809 total boxes (7931
is performed using recall@K.                                              ‘person’ boxes). For zero-shot classification, we use the
VGGSound (VGGS) [8]. This dataset contains about 200K                     following class names for the ‘person’ class - [’per-
video clips of 10s length, annotated with 309 sound classes               son’, ’man’, ’woman’, ’people’], and [’street’,
consisting of human actions, sound-emitting objects and                   ’road’, ’car’, ’light’, ’tree’] for the background
human-object interactions. We only use the audio from the                 class.
test set (with 14073 clips) for 0-shot classification. The                Ego4D (Ego4D) [23]. For the Ego4D dataset, we consider
evaluation is done using the top-1 accuracy metric.                       the task of scenario classification. There are 108 unique sce-
SUN RGB-D (SUN). We use the registered RGB and Depth                      narios present in the 9,645 videos of the Ego4D dataset. We
maps provided in the SUN RGB-D [69] dataset train set                     filter out all videos annotated with more than one scenario
(∼5K pairs) for training our model. We follow [21] to post                which yields 7,485 videos with a single scenario assigned.
process the depth maps in two steps - 1) we use in-filled                 For each video, We select all time-stamps that contains a
   1 https : / / www . robots . ox . ac . uk / vgg / research / audio -   synchronized IMU signal as well as aligned narrations. We
                                              ˜
retrieval/resources/benchmark- files/AudioCaps_retrieval_                 sample 5 second clips around each time-stamp. The dataset
dataset.tar.gz                                                            is split randomly such that we have 510,142 clips for train-
ing, and 68,865 clips for testing. During training we only        where k ∈ {1, 2, 4, 8}. We fix the k samples such that
use the video frames and their corresponding IMU signal.          our model and the baselines use exactly the same samples
We use the test split to measure zero-shot scenario classi-       during training. For all few-shot evaluations, including the
fication performance, where each clip of IMU signal is as-        baselines, we freeze the encoder parameters and only train
signed the video-level scenario label as its ground-truth.        a linear classifier.
                                                                  Audio: For audio few-shot training with ESC, our model
A.1. Data Representations                                         and the baselines are trained using AdamW with a learning
    We use the standard RGB and RGBT representations              rate of 1.6 × 10−3 and weight decay of 0.05 for 50 epochs.
for images and videos. For videos, we use 2-frame clips,          Depth: For depth few-shot training with SUN, our model
inspired from recent work on ViT-style video architec-            and the baselines are trained using AdamW with a learning
tures [16, 71], where a video patch is 2×16×16 (T×H×W ).          rate of 10−2 and no weight decay for 60 epochs.
We inflate the visual encoder’s weights to work with spa-
tiotemporal patches and and at inference time we aggregate        B.3. Zero-shot evaluation details
features over multiple 2-frame clips. Hence, we can use           Query Templates. For all evaluations, we use the default
models trained on image-text data directly on videos.             set of templates from CLIP [60].2 Note that we use the same
    We used a single-channel image for the thermal data           templates for non visual modalities like audio and depth as
since it is the natural form in which current infrared thermal    well since we only use semantic/textual supervision associ-
sensors return data [32]. For single-view depth, we ex-           ated with images.
perimented with different encodings – absolute depth [66]
as returned by sensors like the Kinect, inverse depth [62],       B.4. Qualitative evaluation details
disparity [62], and HHA [25, 26]. Overall, we found that          Cross-modal nearest neighbors. We perform the re-
disparity representation (which is a single-channel image)        trieval on the embedding feature after temperature scaling.
worked the best. For audio we use the raw waveform pro-           The nearest neighbors are computed using cosine distance.
cessed into mel-spectrograms [22], as described in the main       In Figure 1, we show retrievals for audio from ESC, image
text. For IMU we use a 6 × T tensor to represent the se-          retrievals from IN1K and COCO, depth from SUN-D, and
quence of IMU sensor readings over time.                          text from AudioCaps.
                                                                  Embedding arithmetic. For arithmetic, we again use the
B. Evaluation details                                             embedding features after temperature scaling. We ℓ2 nor-
   We now describe the evaluation setups used in this work.       malize the features and sum the embeddings after scaling
                                                                  them by 0.5. We use the combined feature to perform near-
B.1. Inference implementation details                             est neighbor retrieval using cosine distance, as described
Audio/Video: For both these temporal modalities (whether          above. In Figure 1, we show combination of images and
operated upon together during pre-training or separately          audio from IN1K and ESC, and show retrievals from IN1K.
during inference), we sample fixed length clips to operate        Audio→Image Generation. For generating images form
on. During training, we randomly sample a clip, typically         audio clips, we rely on an in-house reproduced implemen-
2s in length. At inference time, we uniformly sample multi-       tation of DALLE-2 [61]. In DALLE-2, to produce images
ple clips to cover the full length of the input sample. For in-   from text prompts, the image generation model relies on
stance, for 5s ESC videos, we would sample ⌈ 25 ⌉ = 3 clips.      text embeddings produced by the pre-trained CLIP-L/14
For video clips, we sample a fixed number of frames from          text encoder. Since I MAGE B IND naturally aligns CLIP’s-
each clip. For audio, we process each raw audio waveform          embedding space to that of other modalities proposed in the
by sampling it at 16KHz followed by extracting a log mel          paper, we can upgrade the DALLE-2 model to generate im-
spectrogram with 128 frequency bins using a 25ms Ham-             ages by prompting it with these new unseen modalities. We
ming window with hop length of 10ms. Hence, for a t sec-          achieve zero-shot audio to image generation with DALLE-2
ond audio we get a 128 ×100t dimensional input.                   by simply using the temperature-scaled audio embeddings
IMU: For IMU, we sample fixed length clips of 5 seconds,          generated by I MAGE B IND’s audio encoder as a proxy for
centered around time-stamps that are aligned with narra-          the CLIP’s text embeddings in the DALLE-2’s image gen-
tions. For each clip, we get a 6×2000 dimensional input and       eration model.
we measure the zero-shot performance for scenario classifi-       Detecting objects using audio. We extract all audio de-
cation using each clip as an independent testing sample.          scriptors from the validation set of ESC using an I MAGE -
                                                                  B IND ViT-B/32 encoder, yielding 400 descriptors in total.
B.2. Few-shot evaluation details                                  We use an off-the-shelf CLIP-based Detic [88] model and
For the few-shot results in Figures 3 using the ESC and              2 https : / / github . com / openai / CLIP / blob / main / notebooks /

SUN datasets, we sampled k training samples per class,            Prompt_Engineering_for_ImageNet.ipynb
                                                                    Text query: ”Cooking a meal”
use the audio descriptors as the classifier for Detic in place
of CLIP text-based ‘class’ embeddings. We use a score
threshold of 0.9 for the qualitative results in Figure 5.

C. Pretraining details
C.1. Best setup
    In Table 9 we detail the hyperparameters used to pre-
train each of the models reported in Table 4. Our experi-           Text query: ”A person doing gardening work outdoors”
ments were done on 32GB V100 or 40GB A100 GPUs.

 Config                     AS       SUN        LLVIP      Ego4D
 Vision encoder                           ViT-Huge
 embedding dim.             768       384        768        512
 number of heads             12         8         12         8
 number of layers            12        12         12         6
 Optimizer                                AdamW
 Optimizer Momentum                 β1 = 0.9, β2 = 0.95
 Peak learning rate        1.6e-3   1.6e-3       5e-4      5e-4
 Weight decay                0.2      0.2        0.05       0.5
 Batch size                 2048      512        512       512     Figure 7. IMU retrievals. Given a text query, we show some
 Gradient clipping           1.0      1.0         5.0       1.0    IMU retrievals and corresponding video frames.
 Warmup epochs                                2
 Sample replication         1.25       50         25        1.0
 Total epochs                64        64         64         8
 Stoch. Depth [29]          0.1       0.0         0.0       0.7    C.2. Ablation setup
 Temperature                0.05      0.2         0.1       0.2
 Augmentations:                                                       The following setup was used for our evaluations in § 5.
   RandomResizedCrop                                               Different from the best setup, all ablation experiments uses
     size                                   224px
                                                                   ViT-Base both for the vision and the modality-specific en-
     interpolation                  Bilinear    Bilinear
   RandomHorizontalFlip             p = 0.5     p = 0.5            coders. The models are trained for 16 epochs, unless men-
   RandomErase                      p = 0.25 p = 0.25              tioned otherwise.
   RandAugment                        9/0.5       9/0.5               For Table 5b, the differences between the linear and MLP
   Color Jitter                        0.4         0.4
   Frequency masking         12                                    heads are detailed below: The MLP head did not improve
                                                                   performance in our experiments.

             Table 9. Pretraining hyperparameters                   Linear   Linear(in dim, out dim)
                                                                    MLP      Linear(in dim, in dim), GELU, Linear(in dim, out dim)




Contrastive loss batch size vs. modalities. While con-
trastive losses do require larger batch size, this requirement     D. Additional Results
didn’t increase with the number of modalities. As noted
                                                                   Qualitative results. We show additional results (along with
in Appendix B, our experiments (Table 2) sample a mini-
                                                                   audio) in the accompanying video.
batch of one pair of modalities at a time: batch size of 2K
for (video, audio), and 512 for (image, depth), (image, ther-      Practical applications of disparate modalities. In gen-
mal), and (video, IMU). These batch sizes are smaller than         eral, a shared embedding space enables a variety of differ-
the >32K batch sizes used in prior work [10, 60].                  ent cross-modal search and retrieval applications. e.g., since
                                                                   IMU sensors are ubiquitous (in phones, AR/VR headsets,
                                                                   health trackers), I MAGE B IND can allow a user to search
Combining modalities. In Table 4, we show results with             an IMU database using text queries (without training with
combining the audio and video modalities. We combine               IMU-text pairs). IMU-based text search has applications
them by extracting embeddings from both modalities per             in healthcare/activity search. For instance, in Figure 7 we
sample and computing a linear combinations of those em-            show examples of IMU (and accompanying video) retrieval
beddings. We used a weight of 0.95 for video and 0.05 for          given textual search query. The retrieved IMU sample,
audio for this combination, which was found to perform the         shown as 3-channel Accelerometer (Acc) and Gyroscope
best.                                                              (Gyro) recording, matches the text query.
E. Additional Ablations
Design choices in losses. Since the modality-specific en-
coders are trained to align with a frozen image encoder, we
tried using a ℓ2 regression objective. For ZS SUN top-1
accuracy, we observed that regression led to good perfor-
mance as the sole objective (25.17%) or jointly with con-
trastive (29.04%). However, it did not improve over using
only the contrastive objective (31.74%).

F. Ethical considerations
   I MAGE B IND learns a joint embedding for multiple
modalities. Such an embedding is intended to associate se-
mantically related concepts from different modalities. How-
ever, such an embedding may also create unintentional as-
sociations. Thus, joint embedding models, including I M -
AGE B IND must be studied carefully with a lens towards
measuring such associations, and their implications. I M -
AGE B IND leverages the image-text embeddings learned by
a pretrained model on large web-based data which has bi-
ases as documented in different studies [60]. For learning
joint embeddings for other modalities such as audio, ther-
mal, depth, and IMU we leverage datasets mentioned in Ap-
pendix A. These joint embeddings are thus limited to the
concepts present in the datasets. For example, the thermal
datasets we used are limited to outdoor street scenes, while
the depth datasets are limited to indoor scenes.
