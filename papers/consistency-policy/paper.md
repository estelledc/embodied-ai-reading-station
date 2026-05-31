                                                                                    Consistency Policy
                                               Accelerated Visuomotor Policies via Consistency Distillation
                                                                 Aaditya Prasad1 , Kevin Lin1 , Jimmy Wu2 , Linqi Zhou1 , Jeannette Bohg1
                                                                              1 Stanford University    2 Princeton University

                                                                                    https://consistency-policy.github.io


                                            Abstract—Many robotic systems, such as mobile manipulators
                                         or quadrotors, cannot be equipped with high-end GPUs due to




arXiv:2405.07503v2 [cs.RO] 28 Jun 2024
                                         space, weight, and power constraints. These constraints prevent
                                         these systems from leveraging recent developments in visuomotor
                                         policy architectures that require high-end GPUs to achieve fast
                                         policy inference. In this paper, we propose Consistency Policy, a
                                         faster and similarly powerful alternative to Diffusion Policy for                                 (a) Diffusion Policy
                                         learning visuomotor robot control. By virtue of its fast inference
                                         speed, Consistency Policy can enable low latency decision making
                                         in resource-constrained robotic setups. A Consistency Policy is
                                         distilled from a pretrained Diffusion Policy by enforcing self-
                                         consistency along the Diffusion Policy’s learned trajectories. We
                                         compare Consistency Policy with Diffusion Policy and other
                                         related speed-up methods across 6 simulation tasks as well as
                                         three real-world tasks where we demonstrate inference on a
                                         laptop GPU. For all these tasks, Consistency Policy speeds up                                    (b) Consistency Policy
                                         inference by an order of magnitude compared to the fastest
                                         alternative method and maintains competitive success rates. We       Fig. 1: Both Diffusion and Consistency Policy work by sampling random
                                         also show that the Conistency Policy training procedure is robust    actions and denoising them into predictions of actions. xt denotes the current
                                                                                                              action distribution at a time t ∈ [0, T ], where larger times correspond to
                                         to the pretrained Diffusion Policy’s quality, a useful result that   noisier actions. The figure shows distributions of predicted action sequences
                                         helps practioners avoid extensive testing of the pretrained model.   (indicated by the sequences of red to green dots) at different stages of the
                                         Key design decisions that enabled this performance are the choice    respective generation process. a) Diffusion Policy denoises an action sequence
                                         of consistency objective, reduced initial sample variance, and the   over many steps, resulting in high inference costs when deploying the policy
                                         choice of preset chaining steps.                                     on a robot. b) Consistency Policy generates an action sequence in a single
                                                                                                              step, allowing for much faster inference speeds than Diffusion Policy while
                                                               I. I NTRODUCTION                               retaining competitive success rates.
                                            Diffusion models have recently demonstrated impressive re-
                                         sults in Imitation Learning for robot control [6, 19, 22, 33, 35].
                                         In particular, Diffusion Policy [6] demonstrates state-of-the-art    these observations, our goal is to retain the performance of
                                         imitation learning performance on a variety of robotics tasks.       Diffusion Policy while drastically reducing inference time.
                                            One key drawback of diffusion models is the inference                In the image generation domain, there has been much
                                         time required to generate actions. Diffusion models produce          interest in distillation techniques [16, 24, 29, 31, 34] that use
                                         outputs by sequentially denoising from an initial, noisy state.      a pre-trained diffusion model to teach a new student model
                                         This process means that they require multiple forward eval-          how to take larger denoising steps, reducing the total number
                                         uations to predict an action and that reducing the number of         of function evaluations required for generation. One set of
                                         evaluations degrades performance. Diffusion Policy [6] uses a        distillation techniques [14, 29, 31] is based on the insight that
                                         diffusion framework named Denoising Diffusion Probabilistic          a trained diffusion model can be interpreted as solving an ODE
                                         Models (DDPM) [12] evaluated using 100 denoising steps,              [30]. These approaches use the uniqueness of the solutions to
                                         which on an NVIDIA T4 can take around one second per                 these ODEs and enforce consistency between denoising steps
                                         action generation.                                                   that begin at different positions on the same ODE trajectory.
                                            Such slow inference constrains the use cases for Diffusion        The distilled student network is thus called a Consistency
                                         Policy to tasks and settings that tolerate lengthy reaction times    Model. In image generation, distilled Consistency Models have
                                         and high computational costs. While quasi-static tasks such          been shown to produce single or few-step generations that rival
                                         as simple pick-and-place or part assembly can permit slow            traditional diffusion models in sample quality. We adapt these
                                         inference speeds, dynamic tasks such as balancing objects or         Consistency Model frameworks for the robotics domain. We
                                         navigating dynamic environments often require faster control         first replace the diffusion frameworks that Diffusion Policy
                                         frequencies. Furthermore, Diffusion Policy can be impracti-          employs with EDM [13], an analogous multi-step framework
                                         cally slow for robots with on-board compute constraints. Given       more commonly used for consistency distillation. We train
a teacher model using the EDM framework and then distill           ParaDiGMS drop rapidly as they are forced to lessen their
it using an adaptation of the Consistency Trajectory Model         batch window size by VRAM availability or other constraints.
(CTM) objective proposed by Kim et al. [14]. Key design            Additionally, this method still remains slower than single step
decisions include the specific choice of consistency objective,    prediction, which Consistency Policy enables.
reduced initial sample variance, and the choice of preset             Distillation based techniques [18, 24] have also been ex-
chaining steps. We also provide insights about the role of         plored to accelerate diffusion model inference speeds in the
dropout along a specific region of the CTM objective, and          text-to-image domain. Many of these distillation techniques
analysis of Consistency Policy’s robustness to teacher quality.    start with a pretrained teacher model and train a new student
   Overall, we demonstrate that inference speed of our ap-         model to take larger steps over the ODE trajectories that the
proach is on average about an order of magnitude faster than       teacher has already learned to map [14, 16, 24, 29, 31, 34]. By
the fastest baseline (see Table I) and maintains similar or        taking these larger steps, the student model is able to complete
higher success rates than all baselines on a variety of tasks.     a generation in a smaller total number of steps.
                                                                      Of the distillation based techniques, the consistency model
                     II. R ELATED W ORK                            works [14, 29, 31] support both single and multi-step sampling
   Diffusion models have achieved many state-of-the-art re-        of outputs. Consistency distillation techniques exploit the self-
sults across image, audio, video, and 3D generation [1, 14,        consistency property [31] of ODE trajectories by training the
21, 23, 26, 28]. In the context of robotics, diffusion models      student model to predict the same output when given two
have been used as policy networks for imitation learning to        distinct points along the same ODE trajectory. This objective
great effect [6, 19, 33]. However, vanilla variants of diffusion   was first introduced by Song et al. [31], who choose a pair
models, such as Denoising Diffusion Probabilistic Models           of adjacent input points and taught the student model to map
(DDPMs) [12], suffer from long inference times due to their        those input points to the same starting point on the given ODE
need for many iterative sampling steps. In particular, DDPM        trajectory, where the distinct points are sampled with the help
[12] can be interpreted as solving a Stochastic Differential       of a pretrained diffusion model. Kim et al. [14] generalized
Equation backwards in time, and is thus characterized by a         this method by training for arbitrary step sizes and arbitrarily
stochastic denoising process that integrates small amounts of      spaced input points, achieving state of the art results in the
Brownian motion as it generates an output. DDPM has a fixed        image-generation domain. In this work, we study how the
step count that is often 100+, making it the slowest framework     latter, more generalized framework, Consistency Trajectory
used by Diffusion Policy [6].                                      Models (CTMs) [14], can be adapted for the robotics domain.
   One line of work [28] addresses the long inference times of        Concurrently, [4, 8] have explored the use of consistency
diffusion models by reducing the number of denoising steps         models as a policy class for state-based continuous control.
required for a prediction. As opposed to the stochastic solver     Chen et al. [4] adapts the consistency distillation model ob-
of DDPM, Denoising Diffusion Implicit Models (DDiM) [28]           jective [31] for state-based offline RL settings. The authors do
can be interpreted as integrating over a deterministic ODE         not use the generalized CTM framework from Kim et al. [14]
[24]. Importantly, DDiM allows for a variable step count,          and are also unable to directly distill a teacher model because
meaning a DDiM-based network could be trained with a large         of their focus on Q-learning rather than behavior cloning. [8]
number of denoising steps but evaluated at inference time          leverages the consistency training (as opposed to distillation)
with a much smaller number of steps. EDM [13] follows this         objective from [31] for state-based, continuous control tasks.
pattern of integrating the deterministic ODE and also allows       The consistency training objective replaces a teacher model
for a small number of denoising steps at test time. EDM            with a Monte-Carlo estimator and thus allows for teacher-
differs from DDiM through modifications to preconditioning         free training. While it may achieve good results for state-
and weighting. However, even with variable step schemes such       based policies on common RL benchmarks, we demonstrate
as DDiM and EDM, reducing the number of denoising steps            that this consistency training objective does not lead to an
at inference time often reduces sample quality.                    adequate success rate for much more high-dimensional image-
   Another line of work, introduced by Shih et al. [27], aims to   based policies on relatively more complex robotics tasks.
speed up diffusion models through parallel sampling. Instead          Finally, there has been a long line of work using non-
of denoising sequentially over the ODE, ParaDiGMS [27]             diffusion based model architectures for visuomotor robotics
attempts to converge sliding batches of points along a diffusion   policies. Such alternatives often perform worse than diffusion
ODE’s trajectory in parallel via Picard Iteration on those         policies on the same tasks, or require external computational
points. This method has the potential for large speed-ups          resources that may be unavailable in many robotics settings.
as points can converge long before a sequential solver may            The original Diffusion Policy paper [5] benchmarked
have reached them, allowing for all previous points to be          against prior state of the art imitation learning (IL) algorithms
skipped. However, ParaDiGMS drastically increases memory           on several robotics simulation [9, 17, 25] and real world
requirements due to this parallelization. In robotics settings,    tasks. Because Diffusion Policy outperformed than all of these
processing hardware is often limited and available compute is      baselines, we choose to baseline against only Diffusion Policy
constrained by other processes that need to run in parallel to     and other Diffusion Policy inference acceleration methods.
the policy network. An actual user might see speed gains from      Most notable among these inferior baselines was Behavioral
Transformer [25], which represents a key alternative to Diffu-     where µ(·, ·) is the drift coefficient, σ(·) is the diffusion
sion Policies: single-step transformer-based models [2, 3]         coefficient, and pt (xt |o) is the noised probability distribution
   RT-1 [2] is a strong single-step transformer-based baseline     at some time t ∈ [0, T ]. To make pT (xt |o) approach a normal
but was designed for massively scaled pre-training. Rather         distribution for T sufficiently
                                                                                               √        large, Karras et al. [13] set
than Diffusion Policy [5] and our own Consistency Policy,          µ(xt , t) = 0 and σ(t) = 2t.
diffusion policy networks such as Octo [19] are more readily          The gradient of the noised probability distribution,
comparable to RT-1. In fact, Octo includes RT-1 as a baseline      ∇ log pt (xt |o), is known as the score. This score function
and shows a marked improvement over it as well as another          is often intractable to compute, so we approximate it with
transformer baseline. Since the improvements we introduce          a neural network. Thus, a denoising step requires evaluating
in this paper are orthogonal to the specific diffusion policy      the score function approximator at the current position xt and
formulation, an Octo policy could also be distilled and made       then integrating the resulting dxt using a numerical integration
into a single or few-step policy network. This could be an         technique.
interesting direction for future work.                                Training the score function approximator can be done with
   Furthermore, we decided not to baseline against RT-2 [3]        numerous objectives, but they all require first performing
and other Vision or Large Language Model enabled policy            the forward diffusion process (noising) on samples from
networks [15, 36] because they leverage the vast pretraining       the original training data set. The unnormalized, perturbed
and scale of the integrated language model and have to be run      distribution at timestep t, pt (xt |o), is equivalent to the original
in the cloud rather than with an on-board computer (which is       data distribution p0 (x|o) convolved with N (0, t2 I). Sampling
the setting we are considering in this work).                      a specific xt ∼ pt (xt |o) can be done by sampling random
                                                                   noise ϵ ∼ N (0, I), multiplying it by t, and then adding
                 III. C ONSISTENCY P OLICY
                                                                   it to a sample from the original distribution x ∼ p0 (x|o):
   We formulate a visuomotor robot policy as a Consistency         xt = x + t ∗ ϵ. Before we pass this position into the score
Trajectory Model [14], and denote this as a Consistency Policy.    function approximator, we normalize it so it has unit variance.
In this section, we begin with a short introduction to Diffusion
Models. We then describe how to train a Consistency Policy,        B. Training
which requires training a teacher Diffusion Policy and then           To train a model capable of few or single-step generation,
distilling this teacher model into a Consistency Policy. We then   we begin by training a teacher model and then distill it into
explain our inference procedures, which include a single-step      a student model. The teacher and student formulations are
process for the fastest inference time possible as well as a 3-    described below.
step process that trades off some inference speed for greater         1) Teacher Model (EDM)
accuracy. Finally, we cover some implementation details.              The teacher model, which we denote by sϕ , is trained as per
                                                                   the EDM framework [13]. A trained EDM model takes as input
A. Preliminaries                                                   the current position xt and time t along a PFODE, as well as
   This section provides a gentle introduction to diffusion        the conditioning o, and is used to estimate the derivative of
models as we used them, so we focus on the ODE interpre-           the PFODE’s trajectory:
tation of these models. For further reading, see [12, 13, 30].
                                                                                   dxt       (xt − sϕ (xt , t; o))
Throughout this paper, the word ”trajectory” will only refer                            =−                                    (2)
to the ODE trajectory parameterized by the diffusion step,                           dt               t
which we explain below. Robot motions (either predicted or         An EDM model has to be used alongside a numerical in-
demonstrated by an expert) will be referred to as “actions” or     tegration method to actually compute positions x along the
“action sequences”, not trajectories.                              PFODE’s trajectory. This repeated estimation of the derivative
   Our diffusion models learn to map random actions xT             of the ODE followed by its numerical integration is what
sampled from the unit Gaussian N (0, I) to specific actions        causes the slow inference speed of Diffusion Models.
x0 drawn from the expert action distribution conditioned on           Following [13], we optimize the Denoising Score Matching
the current observation (which we denote as p0 (x|o)). The         (DSM) loss to train the EDM model:
subscript t with 0 ≤ t ≤ T refers to time along the trajectory
that maps a point from the simple Gaussian distribution at time              LDSM (θ) = Et,x0 ,xt |x0 [d(x0 , sϕ (xt , t; o))]      (3)
T to the complex data distribution at time 0.                      The DSM objective takes a sampled point along a PFODE,
   This process is often formulated as a Probability Flow ODE      (xt , t), and teaches the EDM model to predict the ground truth
(PFODE) [30], where evolving the PFODE forward in time             initial position x0 . The metric d(·, ·) we use is the pseudo-
noises the action and evolving backwards in time denoises the      huber loss:
action. A fully denoised action is the policy’s prediction of                                  q
the expert action.                                                                  d(x, y) = ∥x − y∥22 + c2 − c               (4)
   The general form of this PFODE is                               where c > 0 is a small constant. √    We follow Song’s [29]
                                                  
                             1     2                               recommendation to set c = 0.00054 D for D dimensional
         dxt = µ (xt , t) − σ(t) ∇ log pt (xt |o) dt         (1)
                             2                                     data. This metric acts as a bridge between the standard l1 and
l2 norms, and handles outliers more effectively than the l2 loss
originally used in EDM.
   Following Karras et al. [13], we use Heun’s second order
solver for our numerical integration scheme. We also maintain
the timestep discretization scheme described in EDM [13]
throughout our work.
   2) Student Model (Consistency Policy)
                                                                                                 0
   Kim et al. [14] propose a training objective to distill a
teacher model sϕ (xt , t; o) into a student model gθ (xt , t, s; o)
and achieve state of the art results on image generation tasks
with only one or a small number of inference steps. The                             Fig. 2: CTM enforces self-consistency along a PFODE (black) by sampling
                                                                                    points s, u, t in time such that 0 ≤ s < u < t ≤ T , denoising from t → u
student model gθ (xt , t, s; o) is a neural network that takes in                   with a teacher model under stopgrad (green), denoising from t → s with
a position xt along a PFODE, the time t, and the observation                        the student model (blue), and denoising u → s with the student model under
o. The student model learns to output an estimate of xs where                       stopgrad (orange). We then use the stopgrad student model to take both
                                                                                    generated positions at time s back to time 0. The difference between these
s is any earlier time along the PFODE. The student model is                         two final generations is the computed loss, LCT M (red). In our experiments,
trained using a combination of two objectives: the DSM loss                         we found u = t − 1 and s arbitrary below u to work best.
(see Eq 3) and the CTM loss [14], which we now explain in
more detail.
   Intuitively, the CTM objective can be understood as en-                            with tunable hyperparameters α and β and where subscript
forcing self-consistency along the PFODE since different                            CP stands for Consistency Policy.
points (xt , t) and (xu , u) on the same PFODE should be                              In practice, adapting the standard sampling scheme from
reconstructed into the same position xs at some time s with                         Song et al. [31] such that t and u are adjacent timesteps
0 ≤ s < u < t ≤ T . More formally, the CTM objective                                seemed to work the best. We explore this in more detail in
involves sampling two positions xt , xu on the same PFODE                           Table V. Details such as the skip connection and samplers are
and denoising both positions back to the same timestep s.                           maintained as in [14].
After computing gθ (xt , t, s; o) and gθ (xu , u, s; o), both of
                                            (t)       (u)
these samples, which we refer to as xs and xs respec-                               C. Inference
                                                  (t)
tively, are brought back to time 0 using gθ (xs , s, 0; o) and
     (u)
gθ (xs , s, 0; o) (see Fig. 2). This is done before we compute                         An important property of Consistency Policy is the ability
the loss to ensure that the loss metric is always calculated in                     to trade speed for accuracy at inference time without further
the fully denoised action space, and is taken from [14]. Thus:                      training of the model. We thus describe two procedures:
                                                                                    single-step inference for when speed is paramount and 3-step
           LCT M = d(gθ (x(t)                (u)
                          s , s, 0; o), gθ (xs , s, 0; o))                   (5)    inference for when more accuracy is desired. Both of these
                                                                                    methods remain faster than prior works.
where
                           x(t)                                                        Single-step inference from our trained Consistency Policy
                            s = gθ (xt , t, s; o)                            (6)
                                                                                    works as follows: sample the initial position z ∼ N (0, I),
                          x(u)
                           s = gθ (xu , u, s; o)                             (7)    compute x = gθ (z, T, 0; o) where T is the max timestep we
                                                                                    use during training and o is the current observation, and deploy
and s, u, t are all points on the discretized time mesh.
                                                                                    x as our action to our environment. Note that we are sampling
   The only operation in the prior three equations that we do
                                                                                    z ∼ N (0, I) as opposed to z ∼ N (0, T 2 I), which is the
not put under stopgrad1 is the generation from t → s, which
                                                                                    standard unnormalizing initial sample. This change pushes our
is described in Eq 6.
                                                                                    initial point to start much closer to the mean of the normal
   We sample training times t from a uniform distribution over
                                                                                    distribution and empirically performed better than the standard
the discretized timesteps. After xt is sampled from N (0, t2 I),
                                                                                    sampling scheme, as we display in Table VI. An interpretation
xu is sampled using t − u steps of the teacher EDM model
                                                                                    for this is that sampling closer to the mean ensures that the
and the chosen numerical integrator, as per Eq. 2. Distillation
                                                                                    trajectory is more in-distribution and prevents outliers. This
signal is thus provided via the teacher model’s prediction of
                                                                                    may be related to Pearce et al. [20]’s hypothesis that in
xu given xt .
                                                                                    imitation learning tasks, it is detrimental to push outputs away
   We add this consistency term to the DSM loss in Eq 3 to
                                                                                    from high-likelihood unconditional areas that lie at the center
make the final training objective:
                                                                                    of the expert data distribution, even if such forces are useful
                                                                                    in image generation tasks (in the authors’ case, with classifier
                      LCP = αLCT M + βLDSM                                   (8)
                                                                                    free guidance).
  1 stopgrad is a function in automatic differentiation frameworks such as             We perform 3-step generation by chaining generations
Pytorch which prevents an operation from being added to the computation             together as in Consistency Models [31]. Given chaining
graph. In Fig. 2, gradients from the loss are only calculated with respect to the
operation from t → s (blue). Differentiating with respect to every operation        timesteps {t1 , t2 }, we denoise from T → 0 as usual, then noise
could lead to unstable training and slow or even failed convergence.                to time t1 , denoise back to time 0, and repeat the preceding 2
steps for the remaining chaining timestep. This back-and-forth
process can be interpreted as refining the initial prediction.
   These chaining timesteps are hyperparameters. To our
knowledge, the original Consistency Models work tuned these
steps separately for every task and dataset. Such tuning can
become complicated in the robotics setting when real world           Fig. 3: Robomimic Tasks. We evaluate our method on the single-robot
trials are required to gauge success rates and practitioners may     Robomimic [17] tasks. From left to right, and in increasing order of difficulty,
                                                                     we test Lift, Can, Square, and Tool Hang.
want a strong recommendation that works out of the box.
   Prior works in the image diffusion domain [7, 11] found
that different noise levels correspond to different tasks at         compare our method against baselines in a compute con-
training time. The very earliest time-levels were found to           strained environment. Finally, we perform ablations over our
adjust imperceptible, unimportant features, while the larger         core design choices and explore the intricacies of our model.
time levels formed general attributes or just interpolated to
the center of the target distribution [13]. Timesteps closer to      A. Baselines
the early-middle of the interval contributed the majority of the        Since our goal is for Consistency Policy to maintain Diffu-
important features and details. Thus, we prioritize chaining         sion Policy’s performance while reducing inference time, the
from these early-middle timesteps.                                   DDPM and DDiM variants of Diffusion Policy are our most
   Our discretization scheme warps continuous time to contain        important baselines. Additionally, ParaDiGMS [27] attempts to
far more timesteps at the start of the time interval. Thus, we       increase the generation speed of Diffusion Policy by paralleliz-
use subdivision of discretized time for our timesteps. That          ing the denoising process. The authors publish average speed-
is, for three-step generation, we chain at timesteps {t 2N , t N }   ups for DDPM and DDiM, the two diffusion schedulers used in
                                                         3     3
where N is the total number of steps. This strategy achieves         Diffusion Policy, of 3.7x and 1.6x respectively. ParaDiGMS’s
the desired focus on the early-middle timesteps and behaves          experiments do not show any degradation in performance
differently from other simple strategies such as subdividing         when using parallel sampling, but they do assume access to
continuous time. We qualitatively validate this comparison in        sufficient compute. Thus, we construct an optimistically strong
Section IV-D.                                                        baseline by assuming these speedups can be realized without
                                                                     degrading performance from the standard sequential samplers.
D. Implementation Details
                                                                        As mentioned previously, we maintain the UNet architecture
   We maintain design choices such as predicting action se-          and Diffusion Policy infrastructure (such as the image encoder
quences from Chi et al. [6], with the goal of focusing our           and normalization) between all experiments and methods. We
experimental evaluation on the trained network. To this end,         also use Diffusion Policy’s input and output formats across all
we also maintain the 1D Convolutional UNet architecture              methods. Specifically, we take as input two frames of obser-
from Diffusion Policy for our teacher model. This architecture       vations (including wrist camera image and third person view
conditions on observations and the diffusion timestep t using        camera image, and end effector pose) and output a sequence
FiLM blocks, and diffuses through the action domain using            of end effector poses. Doing so allows us to directly compare
1D convolutional blocks.                                             the generation speed and success rates of the baselines versus
   For our student model, we use the same architecture except        our own.
with expanded FiLM blocks to accomodate conditioning on
the stop timestep, s. We warm start our student model with           B. Simulation Experiments
the trained teacher model and we zero initialize these expanded        Tasks: We evaluate Consistency Policy on six tasks
FiLM layers to prevent them from delaying the warm started           across three benchmarks [9, 10, 17]. Robomimic, Push-T, and
parameters effectiveness, allowing for faster convergence.           Kitchen are all standard benchmarks for visuomotor and state-
   Diffusion Policy also includes results for a Diffusion Trans-     based policy learning, and were tested in the original Diffusion
former as opposed to the 1D Convolutional UNet. We choose            Policy [6] and ParaDiGMS [27] papers.
to use the UNet due only to Diffusion Policy’s [6] remark that         1) Robomimic: From the robomimic [17] benchmark suite,
the transformer often required more hyperparameter tuning                  we evaluate our method on the Lift, Can, Square and
than the UNet: the choice of architecture is orthogonal to our             Tool Hang tasks, which compromise all the single-robot
method and Consistency Policy should benefit from a properly               tasks in Robomimic. For each task, we report results
tuned transformer backbone just as Diffusion Policy did.                   for policies using image-based observations and the
                                                                           proficient human demonstration dataset, which contains
                      IV. E XPERIMENTS                                     200 demonstrations per task.
  We begin by demonstrating Consistency Policy’s strengths             2) Push-T: Adapted from IBC [9], push-T involves pushing
in accuracy and inference speed on a variety of common                     a T-shaped block to a fixed target using a circular end-
robotics baselines that include both image and state based                 effector. We use a dataset of 200 expert demonstrations
control over short and long horizon tasks. We then deploy                  from [6] and report results for policies using state-based
Consistency Policy in a real world trash cleanup task and                  observations.
                                                                                  Policy        NFE        Lift        Can        Square      ToolHang        Push-T
                                                                                  DDPM          27         1.00   .97 ± .01      .93 ± .02    .79 ± .03     .87 ± .03
                                                                                  DDiM          9          1.00   .82 ± .03      .85 ± .03    .14 ± .02     .78 ± .03
                                                                                  CP (ours)     1          1.00   .98 ± .01      .92 ± .02    .70 ± .03     .82 ± .03
                                                                                  CP (ours)     3          1.00   .95 ± .02      .96 ± .01    .77 ± .03     .84 ± .03

                                                                                  Table I: Simulation Benchmark Results – Results presented are average
                                                                                  success rates (for Robomimic Tasks) as well as target area covered (for Push-
                                                                                  T) averaged over 200 rollouts. Each method has an associated Number of
                                                                                  Function Evaluations (NFE) metric that dominates its runtime. Note that we
                                                                                  are optimistic in assuming that speeding up the baseline DDPM and DDiM
                                                                                  Policies [6] with ParaDiGMS [27] does not result in a reduction of success
                                                                                  rates. We report NFEs for the DDPM and DDiM Policies by dividing the
Fig. 4: State-based Simulation Tasks. We also evaluate our method on              original NFEs of 100 by the speedups reported in ParaDiGMS.
two state-based tasks: Franka Kitchen [10] (Left) and Push-T [6, 9] (Right).
Franka Kitchen requires long-horizon and multi-stage performance over a
variety of tasks that can be done in any order, while Push-T tests contact-rich
manipulation of a T-block using a point force.
                                                                                     On Robomimic Can, single-step CP actually outperforms
                                                                                  3-step CP and registers a marginal improvement over DDPM.
                                                                                  This divergence can be explained by stochasticity on an easy
   3) Franka Kitchen: Proposed in [10], this state-based task                     task: if the first CP generation is already earning .98 success
      involves completing four tasks in a kitchen environment                     rate, subsequent chaining steps may not have much room to
      in any order. We use a human demonstration dataset of                       improve outputs and can instead worsen performance. This
      566 demonstrations and report results for policies using                    explains why 3-step CP outperforms single step generation
      state-based observations. This task is specifically useful                  so heavily on Tool Hang: since the task is harder, the chained
      for testing long-horizon capabilities, as it consists of                    outputs can be substantially better than the single step outputs.
      many sub-tasks that have to be completed separately.
   Metrics: The key metric we report in the Robomimic                             Table II: Franka Kitchen Simulation Results – we measure results on
                                                                                  Franka Kitchen as in Diffusion Policy [6], with px denoting the frequency of
experiments is the average success rate earned by a particular                    interacting with x or more objects. Franka Kitchen is a state-based task that
policy network on the given task, along with the standard error                   tests both multi-stage and long-horizon performance. As in Table I, NFE’s for
of this metric. We adopt the procedure from ParaDiGMS [27]                        DDPM and DDiM are divided by the speedups reported in ParaDiGMS [27].
and compute averages and standard errors using the best                             Policy           NFE          p1            p2            p3             p4
checkpoint evaluated 200 times in an online setting. Push-
                                                                                    DDPM             27          1.00           1.00          1.00        .98 ± .01
T reports the percentage of the target area which is covered,                       DDiM             9           1.00        .98 ± .01     .98 ± .01      .93 ± .02
and is otherwise measured in the same way as the previous                           CP (ours)        1        .99 ±.01       .96 ±.01      .95 ±.02       .93 ±.02
tasks. The other important metric that varies between methods                       CP (ours)        3        .99 ±.01       .96 ±.01      .97 ±.01       .94 ±.02
is generation time, which we measure using the Number of
Function Evaluations (NFE). Since inference cost for these
                                                                                     Results for the Franka Kitchen task [10] are presented in
models is dominated by NFE and the network architectures
                                                                                  Table II. Single-step Consistency Policy returns strong results
are held constant, NFE provides a good estimate of relative
                                                                                  for the first two stages of this task but struggles more in the
performance unbiased by GPU imbalances. For DDPM and
                                                                                  later stages. More exploration in long-horizon environments
DDiM, we take the speedups from ParaDiGMS [27] into ac-
                                                                                  is required to understand what exactly Consistency Policy
count by dividing the NFE we used by ParaDiGMS’s reported
                                                                                  struggles to learn in this longer task.
speedup. Diffusion Policy [6] evaluated their models with 100
steps of DDPM and 15 steps of DDiM, so we report 100                                 Table III showcases wall clock times for each of the policies
                                                      3.7 = 27
      15
and 1.6  = 9 NFE respectively, rounding down in both cases.                       in simulation, specifically over the Robomimic Square task.
                                                                                  As expected, Consistency Policy completes inference orders
   Results: Table I displays results for the DDPM and DDiM
                                                                                  of magnitude faster than the Diffusion Policy baselines.
baselines as well as single-step and multi-step Consistency
Policy, which are our contributions. For DDiM on Push-T, we
use the result reported in ParaDiGMS [27]. All other metrics                                         Policy            NFE    Inference Time (ms)
were computed by us.                                                                                 DDPM              100           110
                                                                                                     DDiM               15            11
   Consistency Policy (CP) showcases strong single and multi                                         CP (ours)           1             1
step performance across all tested tasks. Single-step CP often                                       CP (ours)           3             2
falls in between DDPM and DDiM in terms of success rate,
especially on the harder tasks such as Square and Tool Hang,                      Table III: Simulation Inference Speeds – Simulation inference speeds
                                                                                  were measured on an NVIDIA P5000 datacenter GPU and averaged over
but is at least an order of magnitude faster than both. 3-step                    50 rollouts. Benchmarking was done with vanilla Diffusion Policy since we
CP outperforms single-step CP and is competitive with DDPM                        used this as our baseline.
in terms of accuracy and is 3 and 9 times faster than DDiM
and DDPM, respectively.
Fig. 5: Rubbish Clean Up. This task involves: (1) picking up trash, (2)
placing the trash in the trash can, then (3) closing the lid of the trash can.



C. Real World Experiments
   Tasks: We evaluate Consistency Policy in the real world on
three tasks: Trash Clean Up, Plug Insertion, and Microwave.
   1) Trash Clean Up: The robot has to pick up trash lying
       near the can, place the trash inside of the can, and close
       the can’s lid (see Fig. 5).
   2) Plug Insertion: The robot has to pick up a plug and insert                 Fig. 6: Plug Insertion. This task involves: (1) picking up a power adapter,
       it into a socket. This task tends to be more contact rich                 (2) bringing it to a plug and inserting it completely
       and requires precision (see Fig. 6)
   3) Microwave: The robot (a mobile manipulator) has to
       open a microwave, navigate to and retrieve a bag of                       arm rotation quaternion, and 1D for gripper width. Individual
       broccoli, place it in the microwave, close the microwave                  actions have dimension 13 (3 for the base pose, 3 for the
       door, and press the “vegetable” button to start the                       arm position, 6D arm rotation, 1D gripper) and are chunked
       microwave. This task tests long horizon performance and                   together temporally.
       control of a mobile base along with a standard robot arm                     Metrics: For each trained policy, we report average success
       (see Fig. 7).                                                             rates on one policy checkpoint (selected using validation
For the first two tasks, we use a laptop containing a single                     mean-squared error). We also report inference time on the
3070 Ti GPU with 8GB of VRAM for inference. Note that                            3070 Ti GPU. For success rates, we average over 10 trials
we are unable to run ParaDiGMS effectively on this setup                         for the first and third tasks while we average over 20 trials for
due to ParaDiGMS’s high VRAM usage. We also note that,                           the second task. Starting positions were randomized between
on the 3070 Ti GPU, the 100-step DDPM variant of Diffusion                       trials for the first two tasks and were static for the third task.
Policy has an inference time of around 1.5 seconds per forward                      Results: Table IV shows how the baseline DDiM-variant
pass. Thus, we choose as our baseline method the faster and                      of Diffusion Policy achieves similar average success rates as
more realistic DDiM variant of Diffusion Policy, which uses                      our method on the Rubbish Clean Up and Plug Insertion
15 steps for policy inference.                                                   task. However, our method has much lower inference time
   We maintain the same policy inputs, outputs, and archi-                       (∼9x lower latency). Our method maintains its inference
tecture as in the simulation experiment setup, except the                        speed advantage in the Microwave task and performs slightly
observation size of the plug insertion task: for this task, we                   worse than DDiM. More discussion about the mobile task in
use image size of 256x256. At a given timestep t, our policy                     particular is present in Limitations see Sec. V.
receives: an over-the-shoulder image, a camera-in-hand image,                       As Consistency Policy requires 15x fewer forward passes
current end-effector pose and current gripper width. Our policy                  than DDiM, one might expect the full inference speed-up to
outputs an action sequence of length 16, where each step is                      also be around 15x instead of around 9x. This discrepancy
a 10D vector of goal end effector position (3D), goal effector                   exists because of overhead costs such as the observation
rotation (6-D) and goal gripper position (1D).                                   encoder. We discuss inference speeds further in the Appendix.
   For the mobile manipulation microwave task, we use a
Kinova Gen3 7-DoF arm mounted on a holonomic mobile                              D. Ablations
base. Inference was completed on the same laptop with a 3070                        We perform several ablations to validate and explore our
Ti GPU and transmitted to the robot over a router connection.                    design choices. Unless otherwise stated, we calculate success
84x84 resolution image observations were taken from a wrist                      rates using the same evaluation methodology used in our sim-
camera as well as a base mounted camera. Low dimensional                         ulation experiments (see Sec. IV-B). We choose Robomimic
observations include 3D base pose, 3D arm position, 4D                           Square and Toolhang for these experiments since these were
                                                                                  than CTM-local and Consistency Distillation because of the
                                                                                  multiple teacher denoising steps that are required to move from
                                                                                  t → u. Even with the constraint that t − u ≤ 10, we found
                                                                                  that CTM trained more than 40% slower than Consistency
                                                                                  Distillation and CTM-local, which both train at the same
                                                                                  speed. These results were measured on an NVIDIA RTX
                                                                                  A5000.
                                                                                     Initial Sample Variance: Diffusion requires sampling an
                                                                                  initial position from a Gaussian which is then denoised into a
                                                                                  valid action prediction. The normalized initial position is tra-
                                                                                  ditionally sampled from the unit Gaussian, N (0, 1). We chose
                                                                                  to instead sample from a low-variance Gaussian, N (0, T12 ), to
Fig. 7: Microwave. This task involves: (1) navigating to and opening a            push the output to remain more in-distribution.
microwave, (2) navigating to and picking up a bag of broccoli, (3) placing the
bag inside the microwave, (4) closing the microwave door, and (5) starting           In Table VI, we compared the results from sampling from
the microwave.                                                                    the high variance (original) versus low variance (ours) initial
                                                                                  position using both the single-step and 3-step Consistency
               Trash Clean Up                Plug Insertion       Microwave       Policy method on the Robomimic Square task.
            Success     Inference     Success       Inference    Success Rate
                                                                                        Table VI: Initial Sample Variance Ablation On Square Task
            Rate        Time (ms)     Rate          Time (ms)
DDiM      0.8 ± .13        192       0.6 ± 0.11        198        0.5 ± 0.16                    Initial Variance      1-step        3-step
CP (ours) 0.8 ± .13         21       0.7 ±0.10         22         0.4 ± 0.15
                                                                                                1                     .9 ± .02     .91 ± .02
                                                                                                  1
                                                                                                 T2
                                                                                                                     .92 ± .02     .96 ± .01
Table IV: Real World Experiment Results for Multiple Tasks – Results
presented for Consistency Policy and the DDiM variant of Diffusion Policy.
Success rates and standard errors are presented for each task. Inference speeds
are also presented for the first two tasks.                                          Though the low variance inital sample outperforms with
                                                                                  both methods, it seems to serve a much larger impact in the
                                                                                  multi-step case. This is potentially because of the noising that
                                                                                  occurs between steps. The benefit of higher initial variances is
the two hardest image-based tasks.                                                expressivity and multimodality over a complex data distribu-
   Consistency Objective: Recall that the CTM framework                           tion: while the first step begins at some xt ∼ N (0, T12 ), and
learns the function gθ (xt , t, s) by in part optimizing the con-                 so will end at some more central end point, the subsequent
sistency objective in Eq 5. There are three natural consistency                   noising and denoising steps might preserve the high-variance
objectives one could optimize, which differ in the choices                        position’s expressivity.
of starting points t, u as well as the choice of stop point                          Preset Chaining Steps: To validate our decision of focusing
s - all visualized in Fig 2. Song et al. [31] proposed the                        chaining to early-middle timesteps by subdividing discretized
Consistency Distillation objective that enforces consistency                      time rather than continuous time, we tested both of these
between adjacent points t and u with s = 0. Kim et al.                            chaining procedures on Square and Tool Hang. Both experi-
[14] proposed the non-adjacent CTM objective that enforces                        ments are reported in Table VII and were done with 3 chaining
consistency between any points t and u denoised down to                           steps and even subdivisions of the underlying time space (the
any s < u < t. Finally, one can use adjacent t and u like                         discretized mesh versus the continuous time interval).
Consistency Distillation [31] (also termed ‘local consistency’
from CTM [14]) as well as arbitrary s. In our experiments,                             Table VII: Chaining Steps Ablation on Square and Tool Hang
we found that this third objective worked the best. In our                                          NFE             Square       Tool Hang
ablation (see Table V) comparing all three objectives, we
                                                                                                    Discretized    .96 ± .01     .77 ± .03
vary the consistency objective but maintain the auxillary DSM                                       Continuous     .94 ± .02     .72 ± .03
objective as in Eq. 8.

         Table V: Consistency Objective Ablation On Square Task                      Discretized subdivisions outperformed continuous subdivi-
                                                                                  sions heavily on Tool Hang, while both methods achieved
                  Method                        Success Rate                      similar results on Square (with discretized subdivisions doing
                  Consistency Distillation        .88 ± .02                       slightly but not significantly better). As in other ablations, we
                  CTM                             .91 ± .02                       think the benefit of this choice is most apparent on harder tasks
                  CTM-local (ours)                .92 ± .02
                                                                                  such as Tool Hang where there is more room for improvement.
                                                                                  We suggest that any user wishing to improve performance on
  CTM and CTM-local have similar success rates, though                            a difficult task begin by trying subdivided discretized time and
both outperform Consistency Distillation by a slight margin.                      only attempt further hyperparameter tuning if they still need
However, CTM is far more computationally expensive to train                       to do so.
   Teacher Model Quality: Since Consistency Policy requires          different trajectories closer together, there is more signal acting
                                                                                                                   (t)  (u)
distilling a pretrained teacher model into a student network, it     to directly enforce self-consistency on d(xs , xs ) as opposed
                                                                                   (t)       (u)
is relevant to understand how important the teacher model’s          to making xs and xs good predictors of any xs .
performance is to the eventual performance attained by the              As an initial step towards exploring this hypothesis, we
student model. We tested distillation using three different          removed dropout from only the two generations from s → 0
teacher models of varying quality against the Square task and        at training time while retaining it throughout the rest of the
report results in Table VIII.                                        network.
    Table VIII: Robustness to Teacher Model Quality on Square Task        Table IX: Effect of Removing s → 0 Dropout on Square Task

            Teacher Success Rate   Student Success Rate                                     Dropout     Success Rate
            .92 ± .02                    .92 ± .02                                          Enabled       .92 ± .02
            .88 ± .03                    .92 ± .02                                          Disabled      .86 ± .03
            .84 ± .03                    .88 ± .03

                                                                        As seen in Table IX, removing dropout in just this part
   While there was a slight correlation observed between             of training resulted in decreased success rate, which is to be
teacher quality and student success rate, Consistency Policy         expected if dropout is indeed responsible for most of the signal
maintains robustness against the teacher’s success rate over         from the consistency objective. For this, as well as our other
this range of teacher qualities. While the consistency objective     results, dropout was set to 0.2.
LCT M (Eq. 5) depends directly on the teacher, the DSM               Consistency Training: [8] is a concurrent work in RL
objective LDSM (Eq. 3) is independent of the teacher and             that learned a state-based policy using Consistency Training
is likely able to maintain student performance even as the           [29, 31], which substitutes the trained teacher model used to
teacher gets worse. This bodes well for deployment in real           calculate xu from xt (for u = t − 1) with a Monte Carlo
world tasks where extensive testing of the teacher model might       estimate of the score function. We implemented this system
not be possible.                                                     (which we refer to in Table X as CT Policy) and tested it on
   The role of dropout in the CTM Objective: Regular-                Robomimic Lift and Square with single-step generation. Our
ization techniques such as dropout [32] are usually used to          method’s results on Lift and Square are displayed as well for
prevent a highly expressive model from overfitting on the            comparison.
training dataset. However, in our experiments, we found that
dropout plays a far more important role than expected in the                Table X: Consistency Training Ablation on Lift and Square
CTM objective.
                                                                                      NFE              Lift       Square
   Recall that after both t → s and u → s are computed, the
resulting predictions are brought back to time 0 before the loss                      CT Policy     .91 ± .02   .55 ± .04
                                                                                      CP (ours)        1.0      .92 ± .02
is calculated (see Eq. 5 and Fig. 2). It is our hypothesis that
when gθ reaches a certain level of performance, such as when
it is warm started with parameters from a pretrained teacher                                  V. L IMITATIONS
                                       (t)            (u)
model, the loss LCT M = d(gθ (xs , s, 0; o), gθ (xs , s, 0; o))         While Consistency Policy marks strong improvements in
vanishes, providing no training signal.                              raw speed over Diffusion Policy while retaining performance,
   The DSM loss (Eq. 3) that EDM uses to train can be                the distillation procedure does carry drawbacks. Some of
interpreted as teaching the diffusion model to take an original      Diffusion Policy’s [6] benefits include its ability to represent
sample x noised using any noise sample ϵ and some timestep           multimodality in the action distribution, and stable training.
s (we choose this notation deliberately) back to the original        Consistency Policy makes trade-offs regarding these two at-
sample in a single step. Intuitively, feeding a strong image-        tributes.
space diffusion model two noised versions of the same image             Diffusion Policy’s multimodality likely comes from
should return similar images in both cases, even if the two          DDPM’s integration over a Stochastic Differential Equation, as
noised version do not lie on the same trajectory (meaning            opposed to the Ordinary Differential Equation that EDM and
they were not formed with the same sampled ϵ). Following             CTM learn to integrate – the consistency objective requires
                      (t)       (u)
this reasoning, if xs and xs are good approximations of x            distillation of a deterministic trajectory. Indeed, we found that
noised to time s using any ϵ, we should expect the outputs           both the teacher EDM policy and Consistency Policy lose
      (t)                   (u)
gθ (xs , s, 0; o) and gθ (xs , s, 0; o) to be very similar even if   some of Diffusion Policy’s multimodality, e.g., by favoring one
     (t)   (u)
d(xs , xs ) is large. And indeed, empirically we found that          side of the Push-T task over the other. However, Consistency
     (t)   (u)
d(xs , xs ) was at least two orders of magnitude larger than         Policy still performs well on the Push-T task, suggesting that
         (t)              (u)
d(gθ (xs , s, 0; o), gθ (xs , s, 0; o)) with dropout disabled.       this lack of multi-modality is not hurting us on the standard
   When dropout is enabled, the s → 0 step stops being               evaluation tasks used by related work. In future work, we will
deterministic in this manner. Because the Consistency Network        explore how we can potentially re-introduce multimodality to
can no longer rely on these later steps to bring points from         Consistency Policy through more complex sampling schemes.
   We also noticed that Consistency Policy is slightly less           [3] Anthony Brohan, Noah Brown, Justice Carbajal, Yevgen
stable during training than Diffusion Policy, likely due to the           Chebotar, Xi Chen, Krzysztof Choromanski, Tianli Ding,
self-referential nature of the consistency objective (see Eq. 5).         Danny Driess, Avinava Dubey, Chelsea Finn, et al. Rt-2:
   Our mobile manipulation results, where Consistency Policy              Vision-language-action models transfer web knowledge
slightly underperforms Diffusion Policy on accuracy, show-                to robotic control. arXiv preprint arXiv:2307.15818,
cases the varied strengths and weaknesses of our method.                  2023.
   Note first that we were unable to train Consistency Policy         [4] Yuhui Chen, Haoran Li, and Dongbin Zhao. Boost-
on the Microwave task until it was no longer improving due to             ing continuous control with consistency policy. arXiv
external time constraints. Note as well that Consistency Policy           preprint arXiv:2310.06343, 2023.
empirically needs more time in training to reach the same level       [5] Cheng Chi, Siyuan Feng, Yilun Du, Zhenjia Xu, Eric
of performance as Diffusion Policy, especially when taking                Cousineau, Benjamin Burchfiel, and Shuran Song. Dif-
into account time taken to train the teacher policy. This usually         fusion policy: Visuomotor policy learning via action
means both more epochs as well as more time per epoch since               diffusion. arXiv preprint arXiv:2303.04137, 2023.
a Consistency Policy training step requires running the teacher       [6] Cheng Chi, Siyuan Feng, Yilun Du, Zhenjia Xu, Eric
model in addition to multiple forward passes of the student               Cousineau, Benjamin CM Burchfiel, and Shuran Song.
network.                                                                  Diffusion Policy: Visuomotor Policy Learning via Action
   This increase in training time is exacerbated by the difficulty        Diffusion. In Proceedings of Robotics: Science and
of the task (Microwave took much longer to distill than either            Systems, Daegu, Republic of Korea, July 2023. doi:
of the other tasks did) and is intuitive given that Consistency           10.15607/RSS.2023.XIX.026.
Policy is fitting a harder problem (a single-step policy rather       [7] Jooyoung Choi, Jungbeom Lee, Chaehun Shin, Sungwon
than a multi-step policy over the same task). It is important             Kim, Hyunwoo Kim, and Sungroh Yoon. Perception
to consider how these trade-offs interact with your unique use            prioritized training of diffusion models. In Proceedings
case, rather than comparing these tools in a vacuum.                      of the IEEE/CVF Conference on Computer Vision and
                                                                          Pattern Recognition, pages 11472–11481, 2022.
                      VI. C ONCLUSION                                 [8] Zihan Ding and Chi Jin. Consistency models as a rich
                                                                          and efficient policy class for reinforcement learning. In
   We present the use of consistency-based training objectives
                                                                          The Twelfth International Conference on Learning Rep-
for training high performing, low-latency visuomotor robot
                                                                          resentations, 2024. URL https://openreview.net/forum?
policies. In our evaluation suite of 9 tasks in simulation and in
                                                                          id=v8jdwkUNXb.
the real world, we demonstrate that consistency policies yield
                                                                      [9] Pete Florence, Corey Lynch, Andy Zeng, Oscar A
a dramatic increase in inference speeds compared to previous
                                                                          Ramirez, Ayzaan Wahid, Laura Downs, Adrian Wong,
diffusion policy methods without sacrificing success rates.
                                                                          Johnny Lee, Igor Mordatch, and Jonathan Tompson.
Through our ablations, we also highlight key design decisions
                                                                          Implicit behavioral cloning. In 5th Annual Conference
that led to visuomotor policies with the highest success rates.
                                                                          on Robot Learning, 2021.
These include: the choice of consistency objective, lowering
                                                                     [10] Abhishek Gupta, Vikash Kumar, Corey Lynch, Sergey
the initial sample variance, the use of dropout, and the choice
                                                                          Levine, and Karol Hausman. Relay policy learning: Solv-
of preset chaining steps. In future work, we hope to explore
                                                                          ing long-horizon tasks via imitation and reinforcement
deeper explanations behind certain experimental results, such
                                                                          learning. In Conference on Robot Learning, pages 1025–
as chaining dynamics and the role of dropout along the s → 0
                                                                          1037. PMLR, 2020.
generations, and also port Consistency Policy to robots that can
                                                                     [11] Tiankai Hang, Shuyang Gu, Chen Li, Jianmin Bao, Dong
better utilize fast inference speeds, including legged, winged,
                                                                          Chen, Han Hu, Xin Geng, and Baining Guo. Efficient
and other mobile platforms.
                                                                          diffusion training via min-snr weighting strategy. arXiv
   Acknowledgements: Toyota Research Institute provided
                                                                          preprint arXiv:2303.09556, 2023.
funds to support this work.
                                                                     [12] Jonathan Ho, Ajay Jain, and Pieter Abbeel. Denoising
                                                                          diffusion probabilistic models. Advances in neural infor-
                         R EFERENCES
                                                                          mation processing systems, 33:6840–6851, 2020.
 [1] Omer Bar-Tal, Hila Chefer, Omer Tov, Charles Her-               [13] Tero Karras, Miika Aittala, Timo Aila, and Samuli Laine.
     rmann, Roni Paiss, Shiran Zada, Ariel Ephrat, Junhwa                 Elucidating the design space of diffusion-based genera-
     Hur, Yuanzhen Li, Tomer Michaeli, et al. Lumiere: A                  tive models. In Proc. NeurIPS, 2022.
     space-time diffusion model for video generation. arXiv          [14] Dongjun Kim, Chieh-Hsin Lai, Wei-Hsiang Liao, Naoki
     preprint arXiv:2401.12945, 2024.                                     Murata, Yuhta Takida, Toshimitsu Uesaka, Yutong He,
 [2] Anthony Brohan, Noah Brown, Justice Carbajal, Yev-                   Yuki Mitsufuji, and Stefano Ermon. Consistency trajec-
     gen Chebotar, Joseph Dabis, Chelsea Finn, Keerthana                  tory models: Learning probability flow ode trajectory of
     Gopalakrishnan, Karol Hausman, Alex Herzog, Jasmine                  diffusion, 2023.
     Hsu, et al. Rt-1: Robotics transformer for real-world           [15] Xinghang Li, Minghuan Liu, Hanbo Zhang, Cunjun Yu,
     control at scale. arXiv preprint arXiv:2212.06817, 2022.             Jie Xu, Hongtao Wu, Chilam Cheang, Ya Jing, Weinan
     Zhang, Huaping Liu, et al. Vision-language foundation            URL https://openreview.net/forum?id=agTr-vRQsa.
     models as effective robot imitators. In The Twelfth         [26] Shelly Sheynin, Adam Polyak, Uriel Singer, Yuval
     International Conference on Learning Representations,            Kirstain, Amit Zohar, Oron Ashual, Devi Parikh, and
     2023.                                                            Yaniv Taigman.        Emu edit: Precise image editing
[16] Xingchao Liu, Xiwen Zhang, Jianzhu Ma, Jian Peng, and            via recognition and generation tasks. arXiv preprint
     Qiang Liu. Instaflow: One step is enough for high-quality        arXiv:2311.10089, 2023.
     diffusion-based text-to-image generation. arXiv preprint    [27] Andy Shih, Suneel Belkhale, Stefano Ermon, Dorsa
     arXiv:2309.06380, 2023.                                          Sadigh, and Nima Anari. Parallel sampling of diffusion
[17] Ajay Mandlekar, Danfei Xu, Josiah Wong, Soroush                  models, 2023.
     Nasiriany, Chen Wang, Rohun Kulkarni, Li Fei-Fei,           [28] Jiaming Song, Chenlin Meng, and Stefano Ermon. De-
     Silvio Savarese, Yuke Zhu, and Roberto Martı́n-Martı́n.          noising diffusion implicit models. In International
     What matters in learning from offline human demonstra-           Conference on Learning Representations, 2021. URL
     tions for robot manipulation. In 5th Annual Conference           https://openreview.net/forum?id=St1giarCHLP.
     on Robot Learning, 2021.                                    [29] Yang Song and Prafulla Dhariwal. Improved tech-
[18] Chenlin Meng, Robin Rombach, Ruiqi Gao, Diederik                 niques for training consistency models. arXiv preprint
     Kingma, Stefano Ermon, Jonathan Ho, and Tim Sali-                arXiv:2310.14189, 2023.
     mans. On distillation of guided diffusion models. In        [30] Yang Song, Jascha Sohl-dickstein, Diederik P. Kingma,
     Proceedings of the IEEE/CVF Conference on Computer               Abhishek Kumar, Stefano Ermon, and Ben Poole. Score-
     Vision and Pattern Recognition, pages 14297–14306,               based generative modeling through stochastic differential
     2023.                                                            equations. 2021. URL https://openreview.net/forum?id=
[19] Octo Model Team, Dibya Ghosh, Homer Walke, Karl                  PxTIG12RRHS.
     Pertsch, Kevin Black, Oier Mees, Sudeep Dasari, Joey        [31] Yang Song, Prafulla Dhariwal, Mark Chen, and Ilya
     Hejna, Charles Xu, Jianlan Luo, Tobias Kreiman, You              Sutskever.      Consistency models.       arXiv preprint
     Liang Tan, Dorsa Sadigh, Chelsea Finn, and Sergey                arXiv:2303.01469, 2023.
     Levine. Octo: An open-source generalist robot policy.       [32] Nitish Srivastava, Geoffrey Hinton, Alex Krizhevsky, Ilya
     https://octo-models.github.io, 2023.                             Sutskever, and Ruslan Salakhutdinov. Dropout: a simple
[20] Tim Pearce, Tabish Rashid, Anssi Kanervisto, David               way to prevent neural networks from overfitting. The
     Bignell, Mingfei Sun, Raluca Georgescu, Sergio Valcar-           journal of machine learning research, 15(1):1929–1958,
     cel Macua, Shan Zheng Tan, Ida Momennejad, Katja                 2014.
     Hofmann, et al. Imitating human behaviour with diffu-       [33] Hsiang-Chun Wang, Shang-Fu Chen, Ming-Hao Hsu,
     sion models. In Deep Reinforcement Learning Workshop             Chun-Mao Lai, and Shao-Hua Sun. Diffusion model-
     NeurIPS 2022, 2022.                                              augmented behavioral cloning, 2023.
[21] Ben Poole, Ajay Jain, Jonathan T. Barron, and Ben           [34] Tianwei Yin, Michaël Gharbi, Richard Zhang, Eli
     Mildenhall. Dreamfusion: Text-to-3d using 2d diffusion.          Shechtman, Fredo Durand, William T Freeman, and Tae-
     In The Eleventh International Conference on Learn-               sung Park. One-step diffusion with distribution matching
     ing Representations, 2023. URL https://openreview.net/           distillation. arXiv preprint arXiv:2311.18828, 2023.
     forum?id=FjNys5c7VyY.                                       [35] Yanjie Ze, Gu Zhang, Kangning Zhang, Chenyuan Hu,
[22] Moritz Reuss, Maximilian Li, Xiaogang Jia, and Rudolf            Muhan Wang, and Huazhe Xu. 3d diffusion policy. arXiv
     Lioutikov. Goal conditioned imitation learning using             preprint arXiv:2403.03954, 2024.
     score-based diffusion policies. In Robotics: Science and    [36] Fanlong Zenga, Wensheng Gana, Yongheng Wanga, Ning
     Systems, 2023.                                                   Liua, and Philip S Yub. Large language models for
[23] Ludan Ruan, Yiyang Ma, Huan Yang, Huiguo He, Bei                 robotics: A survey.
     Liu, Jianlong Fu, Nicholas Jing Yuan, Qin Jin, and
     Baining Guo. Mm-diffusion: Learning multi-modal dif-
     fusion models for joint audio and video generation. In
     Proceedings of the IEEE/CVF Conference on Computer
     Vision and Pattern Recognition, pages 10219–10228,
     2023.
[24] Tim Salimans and Jonathan Ho. Progressive distillation
     for fast sampling of diffusion models. In International
     Conference on Learning Representations, 2022. URL
     https://openreview.net/forum?id=TIdIXIpzhoI.
[25] Nur Muhammad Mahi Shafiullah, Zichen Jeff Cui, Ariun-
     tuya Altanzaya, and Lerrel Pinto. Behavior transformers:
     Cloning k modes with one stone. In Thirty-Sixth Con-
     ference on Neural Information Processing Systems, 2022.
                                                                      OVERVIEW

  The appendix offers additional details with respect to the inference speed benefits of Consistency Policy (Appx. A), the low
variance initial sampler (Appx. B), and the real world experiment (Appx. C).

                                                                    A PPENDIX A
                                                                I NFERENCE S PEEDS

                               Policy       Image Encoder Time (ms)      Network Time (ms)      Total Inference Time (ms)
                               DDiM                     6                        179                       192
                               CP (ours)                6                        13.5                       21

Table XI: All time measurements are given in milliseconds. Image Encoder Time is the time spent encoding image observations before they are passed to
the Policy Network. Network Time is the amount of time spent on forward passes of the Policy Network. Inference Time is the total time in between image
observations being inputted and actions being deployed. This includes the previous two measurements as well as any additional time costs, such as time for
shuttling data.




   In our real world experiments (Section IV-C), we state that 15-step DDiM had an inference time of 192 ms while Consistency
Policy had an inference time of 21 ms (see Table XI). We use inference time to refer to the entire process from when the Policy
Network (either Diffusion Policy or Consistency Policy) is given image observations to when predicted actions are deployed
to the robot’s controller. While the majority of this time is spent on forward passes of the Policy Network, some of it is also
spent encoding the image observations and shuttling memory. Thus, we also measured the time spent only on forward passes
of the Policy Network and the time spent on encoding the image observations. These values are reported in Table XI and were
all measured on an NVIDIA 3070 Ti, which is an underpowered laptop GPU.

   While the relative speed-up of inference time between DDiM and Consistency Policy is 9x, the relative speed-up of network
time is 13.3x, closer to the 15x reduction in steps between our method and DDiM.

   We reported the overall inference speed increase from Section IV-C for easy comparison with other speed-up methods.
However, the actual inference speed-up realized by a practitioner will depend on the other systems they run alongside their
Policy Network, such as their own observation encoders or parallel processes. As the Policy Network consumes a larger and
larger portion of computation relative to other processes at inference time, our method will grow more impactful.

                                                                A PPENDIX B
                                                       L OW VARIANCE I NITIAL S AMPLES

  One of our ablations (see Section IV-D) found that the lower variance initial sampler improved generation quality over the
higher variance initial sampler standard to EDM and Consistency Models.

   Testing EDM on unconditional image generation suggests that this low-variance sample might have some specific benefit
for the robotics domain. Figures 8 and 9 are generations from the same EDM model (trained on CIFAR-10, a 32x32 px image
dataset) using low initial variance sampling and high initial variance sampling.

   These are just heuristic results since the EDM was not trained until convergence, but it is clear that the low-variance region
has no learned support as compared to the high variance initial position, which causes the low variance generation to produce
the gray block in Figure 8.

   It is possible that the difference in support for low variance regions between these domains comes from the difference in
dimensionality of the data distributions the respective diffusion models are trying to fit. The manifold hypothesis states that
real world datasets, such as robot actions or images, are contained in low-dimensional manifolds of Rn . It is intuitive, though
not certain, that the manifold robot actions lie on for a given task and robot is much lower in dimensionality than the space of
all CIFAR-10 images, which contain 60000 images over 10 classes and lives in the 32x32x3 pixel space. For comparison, our
robot action data had dimensionality h x 10, where h was the action horizon length and each action was represented by a 9D
pose vector and 1D gripper action. It is possible that the score model learns to support low-variance initial positions only on
sufficiently low-dimensional data manifolds, like that of robot actions, while this region is left without support when the score
Fig. 8: Low initial variance generation. The diffusion model evidently     Fig. 9: High initial variance generation. The same diffusion model has
did not learn to predict the score in this region.                         learned support for this higher variance region.



model is trained on a higher dimensional space. Such behavior might arise from the fact that higher dimensional Gaussians
concentrate more of their mass at their edges rather than at their centers. If the Diffusion/Consistency Policy is learning a map
to or from a Gaussian in N dimensions, it may support the center of that Gaussian less and less as N increases.

                                                                 A PPENDIX C
                                                       R EAL W ORLD E XPERIMENT S ETUP

  We perform the stationary arm real world experiments (Trash Pick Up and Plug Insertion) using a Franka Panda robot. We
mount a wrist (Zed Mini) camera and an over-the-should camera (Zed Mini) to obtain two images at each timestep. We use
an Meta Quest 2 VR setup to collect 180 demonstrations for our task. The Franka robot accepts control commands at 1kHz,
and receives new commands from either the VR controller or trained policy at 15 Hz. Note that Consistency Policy generates
an end effector action sequence output in around 21ms, and we supply each waypoint to the robot at 15Hz. When the policy
performs inference, we send a control command to the robot to maintain its current end effector pose.
