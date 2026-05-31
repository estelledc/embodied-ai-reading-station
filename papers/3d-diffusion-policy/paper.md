                                                                                    3D Diffusion Policy:
                                                      Generalizable Visuomotor Policy Learning via Simple 3D Representations
                                                Yanjie Ze1∗ Gu Zhang12∗ Kangning Zhang12 Chenyuan Hu13 Muhan Wang13 Huazhe Xu314
                                           1 Shanghai Qi Zhi Institute 2 Shanghai Jiao Tong University 3 Tsinghua University, IIIS 4 Shanghai AI Lab
                                                                                         ∗ Equal contribution


                                                                                               3d-diffusion-policy.github.io




arXiv:2403.03954v7 [cs.RO] 27 Sep 2024
                                                                                                                           Make a Dumpling               Make a Roll-Up




                                                                                                                           Drill the Cube                Pour




                                           (a) 3D Diffusion Policy (DP3) vs. Diffusion Policy: Better, Faster, Stronger.     (b) We evaluate DP3 in diverse simulated and real tasks.
                                         Fig. 1: 3D Diffusion Policy (DP3) is a visual imitation learning algorithm that marries 3D visual representations with diffusion policies,
                                         achieving surprising effectiveness in diverse simulation and real-world tasks, with a practical inference speed.
                                            Abstract—Imitation learning provides an efficient way to teach          12]. Visual imitation learning, which takes high-dimensional
                                         robots dexterous skills; however, learning complex skills robustly         visual observations such as images or depth maps, eases the
                                         and generalizablely usually consumes large amounts of human                need for task-specific state estimation and thus gains the
                                         demonstrations. To tackle this challenging problem, we present
                                         3D Diffusion Policy (DP3), a novel visual imitation learning ap-           popularity [10, 60, 82, 11, 20].
                                         proach that incorporates the power of 3D visual representations               However, the generality of visual imitation learning comes
                                         into diffusion policies, a class of conditional action generative
                                                                                                                    at a cost of vast demonstrations [16, 10, 11]. For example, the
                                         models. The core design of DP3 is the utilization of a compact
                                         3D visual representation, extracted from sparse point clouds               state-of-the-art method Diffusion Policy [10] necessitates 100
                                         with an efficient point encoder. In our experiments involving              to 200 human-collected demonstrations for each real-world
                                         72 simulation tasks, DP3 successfully handles most tasks with              task. To collect the required extensive number of demonstra-
                                         just 10 demonstrations and surpasses baselines with a 24.2%                tions, the entire data-gathering process can span several days
                                         relative improvement. In 4 real robot tasks, DP3 demonstrates
                                                                                                                    due to its long-horizon nature and failure-prone process. One
                                         precise control with a high success rate of 85%, given only 40
                                         demonstrations of each task, and shows excellent generalization            solution is online learning [16], where the policy continues to
                                         abilities in diverse aspects, including space, viewpoint, appear-          evolve through interaction with environments and a learned
                                         ance, and instance. Interestingly, in real robot experiments,              reward function from expert demonstrations. Nevertheless,
                                         DP3 rarely violates safety requirements, in contrast to baseline           online learning in real-world scenarios introduces its own
                                         methods which frequently do, necessitating human intervention.
                                                                                                                    challenges, such as safety considerations, the necessity for
                                         Our extensive evaluation highlights the critical importance of 3D
                                         representations in real-world robot learning. Code and videos are          automatic resetting, human intervention, and additional robot
                                         available on 3d-diffusion-policy.github.io .                               hardware costs. Therefore, how to enable (offline) imitation
                                                                                                                    learning algorithms to learn robust and generalizable skills
                                                                 I. I NTRODUCTION                                   with as few demonstrations as possible is a fundamental
                                            Imitation learning provides an efficient way to teach robots            problem, especially for practical real-world robot learning.
                                         a wide range of motor skills, such as grasping [68, 60, 82],                  To tackle this challenging problem, we introduce 3D Dif-
                                         legged locomotion [40], dexterous manipulation [1, 16], hu-                fusion Policy (DP3), a simple yet effective visual imitation
                                         manoid loco-manipulation [54], and mobile manipulation [57,                learning algorithm that integrates the strengths of 3D visual
representations with diffusion policies. DP3 encodes sparsely        available on https://github.com/YanjieZe/3D-Diffusion-Policy.
sampled point clouds into a compact 3D representation using
a straightforward and efficient MLP encoder. Subsequently,                                    II. R ELATED W ORK
DP3 denoises random noise into a coherent action sequence,           A. Diffusion Models in Robotics
conditioned on this compact 3D representation and the robot
                                                                        Diffusion models, a category of generative models that
poses. This integration leverages not only the spatial under-
                                                                     progressively transform random noise into a data sample, have
standing capabilities inherent in 3D modalities but also the
                                                                     achieved great success in high-fidelity image generation [23,
expressiveness of diffusion models.
                                                                     63, 51, 62]. Owing to their impressive expressiveness, diffu-
   To comprehensively evaluate DP3, we have developed a
                                                                     sion models have recently been applied in robotics, including
simulation benchmark comprising 72 diverse robotic tasks
                                                                     in fields such as reinforcement learning [70, 2], imitation
from 7 domains, alongside 4 real-world tasks including chal-
                                                                     learning [10, 39, 50, 72, 64, 41], reward learning [25, 37],
lenging dexterous manipulation on deformable objects. Our
                                                                     grasping [71, 66, 61], and motion planning [52, 27]. In
extensive experiments demonstrate that although DP3 is con-
                                                                     this work, we focus on representing visuomotor policies as
ceptually straightforward, it exhibits several notable advan-
                                                                     conditional diffusion models, referred to as diffusion poli-
tages over 2D-based diffusion policies and other baselines:
                                                                     cies, following the framework established in [10, 39]. Unlike
   1) Efficiency & Effectiveness. DP3 not only achieves              prior methods that primarily focus on images and states as
       superior accuracy but also does so with significantly         conditions, we pioneer in incorporating 3D conditioning into
       fewer demonstrations and fewer training steps.                diffusion policies.
   2) Generalizability. The 3D nature of DP3 facilitates gen-
       eralization capabilities across multiple aspects: space,      B. Visual Imitation Learning
       viewpoint, instance, and appearance.                             Imitation learning offers an efficient way for robots to
   3) Safe deployment. An interesting observation in our             acquire human-like skills, typically relying on extensive
       real-world experiments is that DP3 seldom gives erratic       observation-action pairs from expert demonstrations. Given the
       commands in real-world tasks, unlike baseline methods         challenges in accurately estimating object states in the real
       which often do and exhibit unexpected behaviors, posing       world, visual observations such as images have emerged as
       potential damage to the robot hardware.                       a practical alternative. While 2D image-based policies [38,
   We conduct several analyses of our 3D visual represen-            11, 10, 35, 16, 56, 68, 15] have predominated the field, the
tations. Intriguingly, we observed that while other baseline         significance of 3D is increasingly recognized [60, 82, 80, 14,
methods, such as BCRNN [35] and IBC [11], benefit from               13, 28, 69].
the incorporation of 3D representations, they do not achieve            Recent 3D-based policies, including PerAct [60], GNFac-
enhancements comparable to DP3. Additionally, DP3 consis-            tor [82], RVT [14], ACT3D [13], and NeRFuser [74], have
tently outperforms other 3D modalities, including depth and          demonstrated notable advancements in low-dimensional con-
voxel representations, and surpasses other point encoders like       trol tasks. However, these works face two primary challenges:
PointNeXt [46] and Point Transformer [84]. These ablation            (1) Impractical setting. These methods convert the imitation
studies highlight that the success of DP3 is not just due to         learning problem into a prediction-and-planning paradigm
the usage of 3D visual representations, but also because of its      using keyframe pose extraction. While effective, this formu-
careful design.                                                      lation is less suitable for high-dimensional control tasks. (2)
   In summary, our contributions are four-fold:                      Slow inference. The intricate architectures of these methods
   1) We propose 3D Diffusion Policy (DP3), an effective             result in slow inference speeds. For instance, PerAct [60]
       visuomotor policy that generalizes across diverse aspects     runs at an inference speed of 2.23 FPS, making it hard to
       with few demonstrations.                                      address tasks that require dense commands, such as highly
   2) To reduce the variance brought by benchmarks and tasks,        dynamic environments. Another closely related work 3D Dif-
       we evaluate DP3 in a broad range of simulated and real-       fuser Actor [28] runs at 1.67 FPS mainly due to the usage of
       world tasks, showing the universality of DP3.                 attention to language tokens and the difference in the task
   3) We conduct comprehensive analyses on visual repre-             setting1 . Compared to this line of works, we endeavor to
       sentations in DP3 and show that a simple point cloud          develop a universal and fast 3D policy capable of tackling
       representation is preferred over other intricate 3D repre-
                                                                        1 The inference speed depends on a number of factors, such as the number
       sentations and is better suited for diffusion policies over
                                                                     of camera views used, the input observation size in pixels, the number of
       other policy backbones.                                       diffusion timesteps and the temporal horizon of prediction. Since the two
   4) DP3 is able to perform real-world deformable object ma-        papers tested on different setups, the authors of 3D Diffuser Actor [28] used
       nipulation using a dexterous hand with only 40 demon-         DP3’s code to set it up on CALVIN, a multi-task language-conditioned setup.
                                                                     They equipped DP3 with attention to language tokens, identical to their model
       strations, demonstrating that complex high-dimensional        for fair comparison. They used two cameras to unproject and obtain a point
       tasks could be handled with little human data.                cloud. They ran both DP3 and 3D Diffuser Actor on the same NVIDIA 2080
                                                                     Ti GPU. Inference for 3D Diffuser Actor takes 600ms and predicts 6 action
   DP3 emphasizes the power of marrying 3D representations           steps. Inference for DP3 takes 581ms and predicts 4 action steps. As a result,
with diffusion policies in real-world robot learning. Code is        the control frequency of 3D Diffuser Actor on CALVIN is higher than DP3’s.
a broader spectrum of robotic tasks, encompassing both high-           all the tasks, which is different from previous works [10, 18]
dimensional and low-dimensional control tasks.                         that set up multiple cameras around robots. This is primarily
                                                                       chosen for its practical applicability in real-world tasks.
C. Learning Dexterous Skills                                              Representing 3D scenes with point clouds. The 3D
   Achieving human-like manipulation skills in robots has              scene could be represented in different ways, such as RGB-
been a longstanding objective pursued by robotics researchers.         D images, point clouds, voxels [7], implicit functions [36],
Reinforcement learning has been a key tool in this en-                 and 3D gaussians [29]. Among them, DP3 uses sparse point
deavor, enabling robots with dexterous hands to master a               clouds as the 3D representation. As evidenced in our ablations
variety of tasks, such as pouring water [47, 81], opening              (see Table IV), point clouds are found to be more efficient
doors [49, 21, 8], rotating objects [44, 76, 78, 45], reorienting      compared to other explicit representations, such as RGB-D,
objects [18, 7, 6], spinning pens [33], grasping tools [1],            depth, and voxels.
executing handovers [83, 24], and building Legos [9]. Imi-                For both simulation and the real world, we obtain depth
tation learning offers another pathway, with approaches like           images with size 84 × 84 from a single camera. We then
DIME [3] and DexMV [47] translating human hand move-                   convert depth into point clouds with camera extrinsics and
ments into robotic actions through retargeting and enabling            intrinsics. We do not use color channels for better appearance
learning from human videos. Our work, however, diverges                generalization.
from these specific design-centric methods. We demonstrate                Point cloud processing. Since the point clouds converted
that enabling the acquisition of these complex skills with             from depth may contain redundant points, such as points from
minimal demonstrations could be achieved by improving the              the table and the ground, we crop out these points and only
imitation learning algorithm itself.                                   leave points within a bounding box.
                                                                          We further downsample points by farthest point sampling
                          III. M ETHOD                                 (FPS, [42]), which helps cover the 3D space sufficiently and
   Given a small set of expert demonstrations that contain             reduces the randomness of point cloud sampling, compared to
complex robot skill trajectories, we want to learn a visuomotor        uniform sampling. In practice, we find downsampling 512 or
policy π : O 7→ A that maps the visual observations o ∈ O              1024 points is sufficient for all the tasks in both simulation
to actions a ∈ A, such that our robots not only reproduce              and the real world.
the skill but also generalize beyond the training data. To this           Encoding point clouds into compact representations. We
end, we introduce 3D Diffusion Policy (DP3), which mainly              then encode point clouds into compact 3D representations
consists of two critical parts: (a) Perception. DP3 perceives          with a lightweight MLP network, as shown in Figure 2. The
the environments with point cloud data and processes these             network, termed as DP3 Encoder, is conceptually simple: it
visual observations with an efficient point encoder into visual        consists of a three-layer MLP, a max-pooling function as an
features; (b) Decision. DP3 utilizes the expressive Diffusion          order-equivariant operation to pool point cloud features, and a
Policy [10] as the action-making backbone, which generates             projection head to project the features into a compact vector.
action sequences conditioning on our 3D visual features. An            LayerNorm layers are interleaved to stabilize training [22].
overview of DP3 is in Figure 2. We will detail each part in            The final 3D feature, denoted as v, is only 64 dimension.
the following sections.                                                As shown in our ablation studies (see Table V), this simple
                                                                       encoder could even outperform pre-trained point encoders
A. A Motivating Example                                                such as PointNeXt [46], aligning with observations from [20],
    To better illustrate the generalization ability of DP3, we first   where a properly designed small encoder is better than pre-
give a straightforward example. We use the MetaWorld Reach             trained large encoders in visuomotor control tasks.
task [77] as our testbed. In this task, the goal is for the gripper
                                                                       C. Decision
to accurately reach a designated target point. To evaluate
the effectiveness of imitation learning algorithms in not only            Conditional action generation. The decision module in
fitting training data but also generalizing to new scenarios, we       DP3 is formulated as a conditional denoising diffusion
visualize the • training points and the • successful evaluation        model [23, 10, 39] that conditions on 3D visual features v
points in 3D space, as shown in Figure 3. We observe that              and robot poses q, then denoises a random Gaussian noise
with merely five training points, DP3 reaches points distributed       into actions a. Specifically, starting from a Gaussian noise aK ,
over the 3D space, while for 2D-based methods, Diffusion               the denoising network ϵθ performs K iterations to gradually
Policy [10] and IBC [11] learn to reach within a plane-like            denoise a random noise aK into the noise-free action a0 ,
area, and BCRNN [35] fails to cover the space. This example
                                                                            ak−1 = αk ak − γk ϵθ ak , k, v, q + σk N (0, I) ,
                                                                                                                 
                                                                                                                                     (1)
demonstrates the superior generalization and efficiency of
DP3, particularly in scenarios where available data is limited.        where N (0, I) is Gaussian noise, αk , γk , and σk are functions
                                                                       of k and depend on the noise scheduler. This process is also
B. Perception                                                          called the reverse process [23].
  We now detail the perception module in DP3. DP3 focuses                Training objective. To train the denoising network ϵθ , we
on only utilizing a single-view camera for policy learning for         randomly sample a data point a0 from the dataset and do a
 (a) End-to-End Training                                                                                                 (b) Evaluation
                                                                                                                                                                               Environment



                                                                                                                                      Observation
  Expert Demonstrations
                                                                   Policy

                                                                                                                                                                                                                          Action
                                                    Perception            Decision
                                                                                                                                                                           Perception       Decision



                        Perception: Compact 3D Representations from Point Clouds                                                                                                           Decision: Diffusion Policy
                              (a) Point Cloud Processing                                      (b) Compact 3D Representations
                                                                                                                                                                                 Robot
    Single-view Point Cloud                                        Points w/o Color            MLP                Projection                                                                   Conditioning
                                                                                                                                                                                 State
                                                                                         (3, 64, 128, 256)        (256, 64)
                                                                                                                                                                                Compact
                                                                                                                                                                                3D Repr.




                                                                                                     LayerNorm                                       LayerNorm
                                                                                                                                                                                                                        Denoising
                                 Crop                      FPS                                                                 Max                                                   𝒂𝑲                          𝒂𝑲#𝟏                 𝒂𝟎𝒕
                                                                                           Linear                                          Linear
                                                                                                                                                                                      𝒕                           𝒕
                                                                                                                  ReLU
                                                                                                                         ×𝟑 Pool                                    Compact
                                                                                                                                                                    3D Repr.
                                                                                                                                                                                                                        × (𝑲 − 𝟏)

                                                                                                                                                                                   Noised                                           Denoised
                                                                                                                                                                                   Action                                            Action




Fig. 2: Overview of 3D Diffusion Policy (DP3). Above: In the training phase, DP3 simultaneously trains its perception module
and decision-making process in an end-to-end manner using expert demonstrations. During evaluation, DP3 determines actions
based on visual observations from the environment. Below: DP3 perceives its environment through single-view point clouds.
These are transformed into compact 3D representations by a lightweight MLP encoder. Subsequently, DP3 generates actions
conditioning on these 3D representations and the robot’s states, using a diffusion-based backbone.
TABLE I: Main simulation results. Averaged over 72 tasks, DP3 achieves 24.2% relative improvement compared to Diffusion
Policy, with a smaller variance. Success rates for individual tasks are in Appendix C.
                      Adroit        Bi-DexHands           DexArt    DexDeform            DexMV                     HORA             MetaWorld                    MetaWorld     MetaWorld      MetaWorld                 Average
 Algorithm \ Task      (3)              (6)                (4)         (6)                 (2)                      (1)             Easy (28)                    Medium (11)    Hard (6)     Very Hard (5)               (72)
 DP3                   68.3              70.2              68.5         87.8              99.5                      71.0              90.9                          61.6         31.7            49.0           74.4±29.9 (↑ 24.2%)
 Diffusion Policy      31.7              61.3              49.0         90.5              95.0                      49.0              83.6                          31.1          9.0            26.6                59.8±35.9

TABLE II: Comparing DP3 with more baselines in simulation. We include IBC, BCRNN, and their 3D variants, termed as
IBC+3D and BCRNN+3D. The 3D variants use our DP3 Encoder for a fair comparison.
                                                   Adroit                                                         MetaWorld                                                         DexArt
         Algorithm \ Task               Hammer      Door            Pen        Assembly                          Disassemble               Stick-Push                 Laptop    Faucet  Toilet         Bucket      Average
         DP3                            100±0             62±4     43±6                99±1                         69±4                            97±4              83±1      63±2        82±4        46±2        74.4
         Diffusion Policy               48±17             50±5     25±4                15±1                         43±7                            63±3              69±4      23±8        58±2        46±1        44.0
         BCRNN                           0±0               0±0      9±3                 3±4                         32±12                           45±11              3±3       1±0         5±5         0±0         9.8
         BCRNN+3D                        8±14              0±0      8±1                 1±5                         11±6                             0±0              29±12     26±2        38±10       24±11       14.5
         IBC                             0±0               0±0      9±2                 0±0                          1±1                            16±2               3±2       7±1        14±1         0±0         5.0
         IBC+3D                          0±0               0±0     10±1                18±9                          3±5                            50±6               1±1       7±2        15±1         0±0        10.4
                                                                               Train                                        Train
                      Train                       Train
                                                                               Test                                         Test
                                                  Test



                                                                                                                              where α¯k and β¯k are noise schedule that performs one step
                                                                                                                              noise adding [23].
                                                                                                                                 Implementation details. We use the convolutional network-
                                                                                                                              based diffusion policy [10]. We use DDIM [62] as the noise
    BC-RNN                          IBC                   Diffusion Policy                          DP3                       scheduler and use sample prediction instead of epsilon predic-
                                                                                                                              tion for better high-dimensional action generation, with 100
Fig. 3: Generalization in 3D space with few data. We use                                                                      timesteps at training and 10 timesteps at inference. We train
MetaWorld Reach as an example task, given only 5 demonstra-                                                                   1000 epochs for MetaWorld tasks due to its simplicity and
tions (visualized by •). We evaluate 1000 times to cover the                                                                  3000 epochs for other simulated and real-world tasks, with
3D space and visualize the • successful evaluation points. DP3                                                                batch size 128 for DP3 and all the baselines.
learns the generalizable skill in 3D space; Diffusion Policy
and IBC [11] only succeed in partial space; BC-RNN [35]                                                                                                             IV. S IMULATION E XPERIMENTS
fails to learn such a simple skill with limited data. Number of
successful trials from left to right: 0 / 285 / 327 / 415.                                                                    A. Experiment Setup
                                                                                                                                Simulation benchmark. Though the simulation environ-
                                                                                                                              ments are increasingly realistic nowadays [34, 73, 65, 85],
diffusion process [23] on the data point to get the noise at
                                                                                                                              a notable gap between simulation and real-world scenarios
k iteration ϵk . The training objective is to predict the noise
                                                                                                                              persists [80, 30, 7]. This discrepancy underscores two key as-
added to the original data,
                                                                                                                              pects: (a) the importance of real robot experiments and (b) the
          L = MSE ϵk , ϵθ (α¯k a0 + β¯k ϵk , k, v, q) ,
                                                     
                                                            (2)                                                               necessity of large-scale diverse simulation tasks for more sci-
entific benchmarking. Therefore, for simulation experiments,      TABLE III: Task suite of DP3, including Adroit [49], Bi-
we collect in total 72 tasks from 7 domains, covering diverse     DexHands [8], DexArt [5], DexDeform [31], DexMV [47],
robotic skills. These tasks range from challenging scenarios      HORA [44], MetaWorld [77], and our real robot tasks. ActD:
like bi-manual manipulation [8], deformable object manipula-      the highest action dimension for the domain. #Demo: Number
tion [31], and articulated object manipulation [5], to simpler    of expert demonstrations used for each task in the domain.
tasks like parallel gripper manipulation [77]. These tasks        Art: articulated objects. Deform: deformable objects.
are built with different simulators including MuJoCo [65],                                   Simulation Benchmark (72 Tasks)
Sapien [73], IsaacGym [34], and PlasticineLab [26], ensuring       Domain             Robo        Object            Simulator      ActD     #Task      #Demo
our benchmarking is not limited by the choice of simulator.        Adroit         Shadow         Rigid/Art         MuJoCo              28      3         10
Tasks in MetaWorld [77] are categorized into various difficulty    Bi-DexHands    Shadow         Rigid/Art        IsaacGym             52      6         10
                                                                   DexArt         Allegro           Art             Sapien             22      4        100
levels based on [55]. A brief overview is shown in Table III.      DexDeform      Shadow          Deform        PlasticineLab          52      6         10
The 3D observations are visualized in Figure 4.                    DexMV          Shadow        Rigid/Fluid         Sapien             30      2         10
                                                                   HORA           Allegro          Rigid         IsaacGym              16      1        100
                                                                   MetaWorld      Gripper        Rigid/Art         MuJoCo              4      50        10
                                                                                              Real Robot Benchmark (4 Tasks)
                                                                   Task        Robo      Object     ActD      #Demo      Description
                                                                   Roll-Up    Allegro    Deform      22        40        Wrap plasticine to make a roll-up
                                                                   Dumpling   Allegro    Deform      22        40        Wrap plasticine and pinch with fingers
                                                                   Drill      Allegro     Rigid      22        40        Grasp the drill and touch the cube
                                                                   Pour       Gripper     Rigid      7         40        Pick the bowl, pour, and place



                                                                       nearly 30 tasks, whereas Diffusion Policy does in fewer
                                                                       than 15 tasks. Additionally, DP3 did not record any
                                                                       task with a success rate below 10%, in contrast to
Fig. 4: 3D visual observations in simulation. We sample                Diffusion Policy, which had more than 10 tasks below
some simulated tasks and show the downsampled point clouds             10%. Note that most of the tasks are only trained with
in these tasks.                                                        10 demonstrations.
   Expert demonstrations. Human-teleoperated data is used           2) Learning efficiency. While we train all the algorithms
in DexDeform; Script policies are used in MetaWorld; Tra-              for 3000 epochs to guarantee convergence, we observe
jectories for other domains are collected with agents trained          that DP3 typically reaches convergence within approx-
by reinforcement learning (RL) algorithms, where we use                imately 500 epochs across all tasks, as illustrated in
VRL3 [67] is used for Adroit; PPO [53] is used in all other            Figure 5. In contrast, Diffusion Policy tends to converge
domains. We generate successful trajectories with RL agents            at a much slower pace or converge into sub-optimal
and ensure all imitation learning algorithms are using the same        results.
demonstrations. The success rates for experts are given in          3) Efficient scaling with demonstrations. As shown in
Appendix C.                                                            Figure 6, we find that in Adroit tasks, both DP3 and
   Baselines. The primary focus of this work is to underscore          Diffusion Policy perform reasonably while DP3 achieves
the significance of the 3D modality in diffusion policies. To          a comparable accuracy with fewer demonstrations. For
this end, our main baseline is the image-based diffusion pol-          some MetaWorld tasks above the easy level such as
icy [10], simply referred to as Diffusion Policy. Additionally,        Assembly and Disassemble, DP3 could achieve higher
we incorporate comparisons with IBC [11], BCRNN [35],                  accuracy when demonstrations are sufficient. This un-
and their 3D variations. However, given that these algorithms          derscores that the 3D modality is not just beneficial but
showed limited effectiveness in our challenging tasks, we eval-        essential for certain manipulation tasks.
uate them on only 10 tasks (see Table II). We emphasize that        4) Competitive inference speed. As depicted in Figure 1,
the image and depth resolution for all 2D and 3D methods are           DP3 achieves an inference speed marginally surpassing
the same across all experiments, ensuring a fair comparison.           Diffusion Policy. Contrary to the prevailing assumption
   Evaluation metric. We run 3 seeds for each experiment               that 3D-based policies are slower [60, 82, 72], DP3
with seed number 0, 1, 2. For each seed, we evaluate 20                manages to achieve efficient inference speeds, primarily
episodes every 200 training epochs and then compute the                attributed to the utilization of sparse point clouds and
average of the highest 5 success rates. We report the mean             compact 3D representations.
and std of success rates across 3 seeds.
                                                                  C. Ablations
B. Efficiency and Effectiveness
                                                                     We select 6 tasks to conduct more ablation studies: Hammer
   DP3 shows surprising efficiency across diverse tasks, mainly   (H), Door (D), Pen (P) from Adroit and Assembly (A), Disas-
reflected in the following three perspectives:                    semble (DA), Stick-Push (SP) from MetaWorld. These tasks
   1) High accuracy. Summarized results are in Figure 1(a)        include both high-dimensional and low-dimensional control
       and results for each domain are in Table I. We observe     tasks, and each task only uses 10 demonstrations. We use the
       that DP3 achieves a success rate exceeding 90% in          abbreviations of these tasks in the tables for simplicity.
                                 Adroit Hammer                                   Adroit Door                         60
                                                                                                                                     Adroit Pen                                  Bi-DexHands Bottle Cap                           Bi-DexHands Scissors                             DexArt Faucet
                  100                                                                                                                                                  100                                             100                                             80
                                                                 60
                                                                                                                                                                        75                                              75                                             60

  Success Rates
                   75                                                                                                40
                                                                 40                                                                                                     50                                              50                                             40
                   50
                                                                 20                                                  20
                   25                                                                                                                                                   25                                              25                                             20
                    0                                             0                                                   0                                                  0                                               0                                              0
                        0              10              20             0               10                  20              0               10                 20              0             10              20                0        10         20          30             0     20       40        60
                                  DexMV Pour                              MetaWorld Assembly                                  MetaWorld Basketball                               MetaWorld Coffee Pull                           MetaWorld Disassemble                          MetaWorld Stick Push
                  100                                           100                                                 100                                                100                                                                                            100
                                                                                                                                                                                                                        80
                   75                                            75                                                  75                                                 75                                                                                             75

  Success Rates
                                                                                                                                                                                                                        60
                   50                                            50                                                  50                                                 50                                              40                                             50
                   25                  DP3                       25                                                  25                                                 25                                              20                                             25
                                       Diffusion Policy
                    0                                             0                                                   0                                                  0                                               0                                              0
                        0               20              40            0           5             10             15         0          5             10             15         0         5             10          15          0         5          10         15             0          5        10         15
                                  Training Steps (k)                            Training Steps (k)                               Training Steps (k)                                  Training Steps (k)                              Training Steps (k)                            Training Steps (k)
Fig. 5: Learning efficiency. We sample 12 simulation tasks and show the learning curves of DP3 and Diffusion Policy. DP3
demonstrates a rapid convergence towards high accuracy. In contrast, Diffusion Policy exhibits a slower learning progress and
achieves notably lower convergence in most tasks.
           Adroit Hammer           Adroit Door             Adroit Pen          MetaWorld Assembly      MetaWorld BasketBall
                  100                                                     100                                                            100                                                         100                                                   100


 Success Rates
                   75                                                      75                                                             75                                                          75                                                    75
                   50                                                      50                                                             50                                                          50                                                    50
                   25                            DP3 (ours)                25                                                             25                                                          25                                                    25
                                             Diffusion Policy
                    0                                                       0                                                              0                                                           0                                                     0
                            1     10      20                50                    1        10        20                         50             1        10        20                            50         1      10         20                     50            1         10     20                     50
                                MetaWorld Shelf Place                              MetaWorld Disassemble                                           MetaWorld Stick Pull                                         MetaWorld Stick Push                             MetaWorld Pick Place Wall
                  100                                                     100                                                            100                                                         100                                                   100


 Success Rates
                   75                                                      75                                                             75                                                          75                                                    75
                   50                                                      50                                                             50                                                          50                                                    50
                   25                                                      25                                                             25                                                          25                                                    25
                    0                                                       0                                                              0                                                           0                                                     0
                            1     10      20                      50              1        10        20                         50             1        10        20                            50         1      10         20                     50            1         10     20                     50
                                 Number of Demonstrations                              Number of Demonstrations                                     Number of Demonstrations                                     Number of Demonstrations                                 Number of Demonstrations
Fig. 6: Efficient scaling with demonstrations. We sample 10 simulation tasks and train DP3 and Diffusion Policy with
an increasing number of demonstrations. DP3 addresses all these tasks well and generally improves the accuracy with more
demonstrations. Diffusion Policy also scales well on some tasks while still falling short of accuracy.
   Choice of 3D representations. In DP3, we deliberately                                                                                                                PointNet [42], PointNet++ [43], PointNeXt [46], and Point
select point clouds to represent the 3D scene. To compare                                                                                                               Transformer [84]. We also include the pre-trained models of
different choices of 3D representations, we implement other                                                                                                             PointNet++ and PointNeXt. Surprisingly, we find that none of
3D representations, including RGB-D, depth, and voxel. We                                                                                                               these complex models and the pre-trained ones are competitive
also compare with oracle states, which include object states,                                                                                                           to DP3 Encoder, as shown in Table V.
target goals, and robot velocity besides robot poses. The RGB-
D and depth images are processed using the same image en-                                                                                                               TABLE V: Ablation on point cloud encoders. We replace
coder as Diffusion Policy, while voxel representations employ                                                                                                           DP3 Encoder with other widely used encoders, including
the VoxelCNN, as implemented in [7]. As demonstrated in                                                                                                                 PointNet [42], PointNet++ [43], PointNeXt [46], and Point
Table IV, these alternative 3D representations fall short of                                                                                                            Transformer [84]. We also include the pre-trained encoders.
DP3. We note that RGB-D and depth images are close and not                                                                                                                   Encoders                                    H              D              P              A           DA            SP        Average
comparable to point clouds, indicating that the proper usage of                                                                                                              DP3 Encoder                              100±0           62±4        43±6           99±1            69±4       97±4           78.3
                                                                                                                                                                             PointNet                                  46±8           34±8        14±4            0±0             0±0        0±0           15.7
depth information is essential. Additionally, we observe that                                                                                                                PointNet++                                0±0             0±0        13±3            0±0             0±0        0±0            2.2
                                                                                                                                                                             PointNeXt                                 0±0             0±0        14±3            0±0             0±0        0±0            2.3
point clouds and oracle states are very competitive, showing                                                                                                                 Point Transformer                         0±0             0±0         6±5            0±0             0±0        0±0            1.0
that point clouds might help learn an optimal policy from                                                                                                                    PointNet++ (pre-trained)                  5±9            19±12       17±6            0±0             0±0        0±0            6.8
                                                                                                                                                                             PointNeXt (pre-trained)                   0±0            36±13       17±6            0±0             0±0        0±0            8.8
demonstrations.
                                                                                                                                                                           Gradually modifying a PointNet. To elucidate the perfor-
TABLE IV: Ablation on 3D representations. We replace the                                                                                                                mance disparity between DP3 Encoder and a commonly used
visual observation and the corresponding encoder in DP3 to                                                                                                              point cloud encoder, e.g., PointNet, we gradually modify a
evaluate different 3D representations.                                                                                                                                  PointNet to make it aligned with a DP3 Encoder. Through
 Repr.                                       H              D              P                    A              DA               SP             Average                  extensive experiments shown in Table VI, we identify that the
 Oracle State                           99±2           61±2               44±3             94±1            72±7               91±8                 76.8                 T-Net and BatchNorm layers in PointNet are primary inhibitors
 Point cloud                           100±0           62±4               43±6             99±1            69±4               97±4                 78.3
 Image                                 48±17           50±5               25±4             15±1            43±7               63±3                 40.7                 to its efficiency. By omitting these two elements, PointNet
 Depth                                 39±15           49±1               12±3             15±4            15±2               62±3                 32.0                 attains an average success rate of 72.3, competitive to 78.3
 RGB-D                                 57±14           47±5               14±2             15±3            14±1               61±3                 34.7
 Voxel                                  54±5           33±3               18±2             10±2            17±1               62±6                 32.3                 achieved by our DP3 Encoder.One plausible explanation for
                                                                                                                                                                        the T-Net is that our control tasks use the fixed camera and
  Choice of point cloud encoders. We compare DP3                                                                                                                        do not require feature transformations from the T-Net. Further
Encoder with other widely used point encoders, including                                                                                                                replacing high-dimensional features with a lower-dimensional
                                                                                                             Adroit Hammer                                 Adroit Door                                  Adroit Pen
                                                                                                 100                                         80                                           60
one would not hurt the performance much (72.5 → 72.3)
                                                                                 Success Rates
                                                                                                  75                                         60
                                                                                                                                                                                          40
but increase the speed. We would explore the reason for the                                       50                                         40
                                                                                                  25                                         20                                           20
failures of other encoders in the future.
                                                                                                   0                                          0                                            0
                                                                                                       0            10             20             0             10             20              0            10             20
TABLE VI: Gradually modifying a PointNet to a DP3-                                                         MetaWorld Assembly                         MetaWorld Disassemble                        MetaWorld Stick Push
                                                                                                 100                                                                                     100
style encoder. Conv: use convolutional layers or linear layers.                                                                              80
                                                                                                  75                                                                                      75

                                                                                 Success Rates
                                                                                                                                             60
w/ T-Net: with or without T-Net. w/ BN: with or without                                           50                                         40                                           50
BacthNorm layers. 1024 Dim: set feature dimensions before                                         25                        sample           20                                           25
                                                                                                                            epsilon
the projection layer to be 1024 or 256. Average success rates                                      0                                          0                                            0
                                                                                                       0        5          10           15        0         5          10           15         0        5          10           15
for 6 ablation tasks are reported.                                                                            Training Steps (k)                          Training Steps (k)                          Training Steps (k)
                                                                                 Fig. 7: Learning curves of DP3 with sample prediction and
   Encoders    Conv       w/ T-Net    w/ BN        1024 Dim         Average      epsilon prediction. With sample prediction, DP3 generally
   PointNet      !           !            !           !               15.7       converges faster, while epsilon prediction is also competitive.
                 %           !            !           !               15.7
                 !           %            !           !               16.0
                 %           %            !           !               26.0
                 %           !            !           %               18.2
 Turnaroud!      !           %            %           !               72.5
                 %           %            !           %               19.8
                 %           !            %           %               26.8
                 %           %            %           %               72.3

   Design choices in DP3. Besides the 3D representations, the
effectiveness of DP3 is contributed by several small design
choices, as shown in Table VII. (a) Cropping point clouds
helps largely improve accuracy; (b) Incorporating LayerNorm
layers could help stabilize training across different tasks [22,                                                    (a) Robots and objects used in DP3.
4]; (c) Sample prediction in the noise sampler brings faster
convergence, also shown in Figure 7; (d) The projection head
in DP3 Encoder accelerates the inference by projecting fea-
                                                                                                             RealSense
tures to the lower dimension, without hurting accuracy; (e) Re-
                                                                                                               L515
moving color channels ensures robust appearance generaliza-
tion; (f) In low-dimensional control tasks, DPM-solver++ [32]
as the noise sampler is competitive to DDIM, while DPM-                                                                                                  Allegro Hand
solver++ could not handle high-dimensional control tasks well.

TABLE VII: Ablation on design choices in DP3. Most of the                                                                                                                       Franka Arm
design choices would not affect the accuracy but bring other
benefits such as appearance generalization by removing color.
 Designs              H          D    P        A      DA       SP      Average                                             (b) Real-world experiment setup.
 DP3                 100±0   62±4    43±6     99±1   69±4     97±4      78.3
 w/o cropping         98±1   69±3    14±1     19±9   32±6     40±2      45.3     Fig. 8: (a) Our robots and objects. (b) Our real-world
 w/o LayerNorm
 w/o sample pred
                     100±0
                      68±3
                             56±4
                             67±8
                                     44±3
                                     37±12
                                              96±2
                                              96±2
                                                     51±3
                                                     58±9
                                                              91±5
                                                              76±9
                                                                        73.0
                                                                        67.0
                                                                                 experiment setup. We use an Allegro hand and a gripper
 w/o projection      100±0   61±2    47±3     99±1   60±8     99±2      77.7     based on Franka arms and include diverse everyday objects in
 w/ color            100±1   67±3    46±4     76±8   75±5     68±3      72.0
 DDIM→DPM-solver++    12±4    9±5    26±5     93±3   58±6     92±14     48.3     our manipulation tasks. A RealSense L515 camera is applied
                                                                                 to capture visual observations.
               V. R EAL W ORLD E XPERIMENTS                                                      2) Dumpling. The Allegro hand first wraps the plasticine
A. Experiment Setup                                                                                 and then pinchs it to make dumpling pleats.
  Real robot benchmark. DP3 is evaluated across 4 tasks on                                       3) Drill. The Allegro hand grasps the drill up and moves
2 different robots, including an Allegro hand and a gripper. We                                     towards the green cube to touch the cube with the drill.
use one RealSense L515 camera to obtain real-world visual                                        4) Pour. The gripper grasps the bowl, moves towards the
observations. All the tasks are visualized in Figure 10 and                                         plasticine, pours out the dried meat floss in the bowl,
summarized in Table III. Our real-world setup and everyday                                          and places the bowl on the table.
objects used in our tasks are shown in Figure 8. We now briefly                  The randomization in each task is shown in Figure 9. For Roll-
describe our tasks:                                                              Up and Dumpling, the plasticine’s shape and the appearance
  1) Roll-Up. The Allegro hand wraps the plasticine multiple                     of the objects placed upon the plasticine are randomized. For
       times to make a roll-up.                                                  Drill and Pour, the variations come from the random positions
of the cube, drill, and bowl.                                        the image-based diffusion policy excels in the Drill task but
   Notably, our tasks using the multi-finger hand are carefully      fails entirely in Roll-Up. In contrast, the depth-based policy
designed to show its advantage over the parallel gripper: In         achieves a notable success rate of 40% in Roll-Up.
Roll-Up and Dumpling, robots could wrap plasticine without           TABLE VIII: Main results for real robot experiments. Each
requiring extra tools, unlike RoboCook [59]; In Drill, the drill     task is evaluated with 10 trials.
in the real world is large and heavy, which is quite difficult
                                                                      Real Robot                 Roll-Up         Dumpling      Drill   Pour    Average
for the gripper to grasp.
                                                                      Diffusion Policy              0              30          70       40    35.0±25.0
   Expert demonstrations are collected by human teleoper-             Diffusion Policy (Depth)     40              20          10       10    20.0±12.2
ation. The Franka arm and the gripper are teleoperated by             DP3                          90              70          80      100    85.0±11.2
the keyboard. The Allegro hand is teleoperated with human
                                                                     C. Generalization
hands by vision-based retargeting [48, 17]. Since our tasks
contain more than one stage and include complex multi-                  Besides the effectiveness in handling all tasks, DP3 show
finger robots and deformable objects, making the process             strong generalization abilities in the real world. We categorize
of demonstration collection very time-consuming, we only             the generalization abilities of DP3 into 4 aspects and detail
provide 40 demonstrations for each task.                             each aspect as follows.
   Baselines. Based on our simulation experiments, image-               Spatial generalization. As illustrated in our motivating
based and depth-based diffusion policies are still powerful,         example, DP3 could better extrapolate in 3D space. We
thus we select them as baselines for real-world experiments.         demonstrate this property in the real world, as shown in
Different vision modalities are visualized in Figure 11.             Table IX. We find that baselines fail to generalize to all test
                                                                     positions while DP3 succeed in 4 out of 5 trials.
                                                                     TABLE IX: Spatial generalization on Pour. We place the
                                                                     bowl at 5 different positions that are unseen in the training
                                                                     data. Each position is evaluated with one trial.




                                                                                                             𝟐        𝟏

    (a) Roll-Up & Dumpling: randomized shapes and appearances                                              𝟑
                                                                                                                   train
                                                                                                         𝟒
                                                                                                                      𝟓
                                                                                                        test

                                                                              Spatial Generalization              1        2      3     4     5
                                                                              Diffusion Policy                    %        %     %     %      %
                                                                              Diffusion Policy (Depth)            %        %     %     %      %
                                                                              DP3                                 %        !     !     !      !

                                                                        Appearance generalization. DP3 is designed to process
            (b) Drill & Pour: randomized object positions
                                                                     point clouds without color information, inherently enabling
Fig. 9: Randomization in collected demonstrations for real-          it to generalize across various appearances effectively. As
world tasks. Roll-Up: The shape of the plasticine and the            demonstrated in Table X, DP3 consistently exhibits successful
vegetables on it varies in each trajectory. Dumpling: The shape      generalization to cubes of differing colors, while baseline
of the plasticine and the distribution of the meat floss on it are   methods could not achieve. It is noteworthy that the depth-
different in each trajectory. Drill: The red and blue rectangles     based diffusion policy also does not incorporate color as input.
respectively mark the range of positions where the cube and          However, due to its lower accuracy on the training object, the
drill can be placed. Pour: The green rectangle marks the range       ability to generalize is also limited.
of positions of the bowl.                                               One solution to improve the appearance generalization abil-
                                                                     ity of image-based methods is applying strong data augmen-
B. Effectiveness                                                     tation during training [20, 19], which however could impede
   Results for our real robot tasks are given in Table VIII.         the learning process [79, 19]. More importantly, the primary
Consistent with our simulation findings, we observe in real-         objective of this work is to demonstrate that DP3, even without
world experiments that DP3 could handle all tasks with high          the aid of any data augmentation, can effectively generalize,
success rates, given only 40 demonstrations. Interestingly, we       thereby underscoring the potential of 3D representations in
also observe that while both image-based and depth-based             real robot learning.
diffusion policies have comparatively low average accuracies,           Instance generalization. Achieving generalization across
they exhibit distinct strengths in specific tasks. For instance,     diverse instances, which vary in shape, size, and appearance,
                                                          Task Progress                                                         End State

              Wrap                                                     Pinch


Dumpling



              Grasp                                                    Reach

   Drill




              Wrap                               Wrap                              Wrap

 Roll-Up




               Pick                              Pour                              Place

   Pour



Fig. 10: Our real robot benchmark consists of 4 challenging tasks. The Allegro hand is required to make a Dumpling, Drill
the cube, and make a Roll-Up. The gripper is required to Pour dried meat floss in the bowl. Each task contains multiple stages.
We visualize the point clouds of the collected trajectories.
                                                                               TABLE XI: Instance generalization on Drill. We replace the
                                                                               cube used in Drill with five objects in varied sizes from our
                                                                               daily life. Each instance is evaluated with one trial.
                                                                                size                                                    Toy Hand
           (a) RGB and Depth              (b) Point Cloud w/ and w/o Color
Fig. 11: Different vision modalities in the real world, include                                                 Cup            Mug
                                                                                              Toy Espeon
images, depths, and point clouds.
                                                                                  Mouse
TABLE X: Appearance generalization on Drill. Algorithms
are trained with the green cube only and evaluated on 5
different colored cubes. Each color is evaluated with one trial.
                                                                                Instance Generalization    Mouse      Espeon    Cup    Mug    Hand
                                                                                Diffusion Policy            %          %         %      %      !
                                                                                Diffusion Policy (Depth)    %          %         !      %      %
       Apperance Generalization (■)   ■      ■      ■       ■      ■            DP3                         !          !         !      !      !
       Diffusion Policy               %      %      %      %       %
       Diffusion Policy (Depth)       %      %      %      %       %
       DP3                            !      !      !      !       !
                                                                               effectively addresses this generalization problem when the
                                                                               camera views are altered slightly. It is important to note that
presents a significantly greater challenge compared to mere                    since the camera view is altered, we manually transform the
appearance generalization. In Table XI, we demonstrate that                    point clouds and adjust the cropped space of the point clouds.
DP3 effectively manages a wide range of everyday objects.                      Accurate transformation isn’t necessary due to the robustness
This success can be primarily attributed to the inherent                       of our network. However, it is crucial to acknowledge that
characteristics of point clouds. Specifically, the use of point                while the network can generalize across minor variations in
clouds allows for policies that are less prone to confusion,                   camera views, significant changes might be hard to handle.
particularly when these point clouds are downsampled. This                        Cluttered Scenes. Despite the simplicity of the DP3 En-
feature significantly enhances the model’s ability to adapt to                 coder, we demonstrate that DP3 is capable of handling tasks in
varied instances.                                                              complex real-world cluttered environments. To illustrate this,
   View generalization. Generalizing image-based methods                       we design a pick & place task (i.e. pick the cube and place
across different views is notably challenging [75], and acquir-                it in the bowl) set in cluttered scenes using a gripper and
ing training data from multiple views can be time-consuming                    collect 50 demonstrations for training. The results presented
and costly [82, 58]. We demonstrate in Table XII that DP3                      in Table XIII show that DP3 solves the task with a high
TABLE XII: View generalization on Roll-Up. Each view is
evaluated with one trial.                                                               TABLE XIV: Safety violation rate. While conducting the
                                                                                        main real-world experiments, we also count the times of safety
      Training View               View 1               View 2          View 3
                                                                                        violation and compute the rate.
                                                                                                                     Examples of Safety Violation



        View Generalization                 View 1       View 2      View 3
        Diffusion Policy                      %             %           %
        Diffusion Policy (Depth)              %             %           %                           Tangled in a twist              Hit the ground                  Hit the ground
        DP3                                   !             !           !
                                                                                         Safety Violation Rate ↓          Roll-Up   Dumpling         Drill   Pour     Average
                                                                                         Diffusion Policy                   90         20             20     0          32.5
success rate. Aligning with our simulation experiments, DP3                              Diffusion Policy (Depth)           20         30             30     20         25.0
                                                                                         DP3                                0          0              0      0          0.0
equipped with PointNeXt fails to address the task. Meanwhile,
DP3 using color point clouds as input performs comparably
to the original DP3 when picking the training yellow cube,                                                               VI. C ONCLUSION
yet it struggles with other colored cubes and diverse objects.                             In this work, we introduce 3D Diffusion Policy (DP3), an
This demonstrates the effectiveness and generalization ability                          efficient visual imitation learning algorithm, adept at managing
of DP3 in complex scenes.                                                               a wide range of robotic tasks in both simulated and real-world
TABLE XIII: Results in cluttered scenes. Each algorithm                                 environments with only a small set of demonstrations. The
is evaluated with 10 trials in the training color. Each out-of-                         essence of DP3 lies in its integration of carefully designed 3D
domain color and object are evaluated with one trial.                                   representations with the expressiveness of diffusion policies.
            RGB                          Point Cloud               Test Objects
                                                                                        Across 72 simulated tasks, DP3 outperforms its 2D counterpart
                                                                                        by a relative margin of 24.2%. In real-world scenarios, DP3
                                                                Charger      Cylinder
                                                                                        shows high accuracy in executing complex manipulations of
                                                                                        deformable objects using the Allegro hand. More importantly,
                                                                       Rope             we demonstrate that DP3 possesses robust generalization
                                                                                        capabilities across various aspects and causes fewer safety
                                                                                        violations in real-world scenarios.
Task Progress                                                                           Limitations. Though we have developed an efficient archi-
                                                                                        tecture, the optimal 3D representation for control is still yet
                                                                                        discovered. Besides, this work does not delve into tasks with
                                                                                        extremely long horizons, which remains for future exploration.
 Cluttered Scenes     Diffusion Policy     DP3 w/ PointNeXt       DP3 w/ color    DP3                              ACKNOWLEDGEMENT
 Success Rate               60                    0                   80          80      We would like to thank Zhecheng Yuan, Chen Wang,
 Train with ■ Cube           ■      ■        ■    Charger         Cylinder       Rope
                                                                                        Cheng Lu, and Jianfei Chen for their helpful discussions. This
                                                                                        work is supported by National Key R&D Program of China
 DP3 w/ color                %      %       %           %            %            %     (2022ZD0161700).
 DP3                         !      !       !           !            !            !
                                                                                                                           R EFERENCES
                                                                                         [1] Ananye Agarwal, Shagun Uppal, Kenneth Shaw, and
D. Observation on Deployment Safety                                                          Deepak Pathak. Dexterous functional grasping. In CoRL,
   In our real-world experiments, we observe that image-based                                2023.
and depth-based diffusion policies often deliver unpredictable                           [2] Anurag Ajay, Yilun Du, Abhi Gupta, Joshua Tenenbaum,
behaviors in real-world experiments, which necessitates human                                Tommi Jaakkola, and Pulkit Agrawal. Is conditional
termination to ensure robot safety. We define this situation as                              generative modeling all you need for decision-making?
safety violation and compute the safety violation rate in our                                arXiv preprint arXiv:2211.15657, 2022.
main real-world experiments, shown in Table XIV. Interest-                               [3] Sridhar Pandian Arunachalam, Sneha Silwal, Ben Evans,
ingly and surprisingly, we find that DP3 rarely violates the                                 and Lerrel Pinto. Dexterous imitation made easy: A
safety, showing that DP3 is a practical and hardware-friendly                                learning-based framework for efficient dexterous manip-
method for real robot learning. An intuitive explanation is that                             ulation. In ICRA, 2023.
since the robots operate in 3D space, directly observing 3D                              [4] Jimmy Lei Ba, Jamie Ryan Kiros, and Geoffrey E
information helps avoid collision. It is important to note that                              Hinton. Layer normalization. arXiv, 2016.
our assessment of safety is primarily qualitative. We intend to                          [5] Chen Bao, Helin Xu, Yuzhe Qin, and Xiaolong Wang.
explore a more theoretical understanding of this observation                                 Dexart: Benchmarking generalizable dexterous manipu-
in our future work.                                                                          lation with articulated objects. In CVPR, 2023.
 [6] Tao Chen, Jie Xu, and Pulkit Agrawal. A system for                Mu, Aravind Rajeswaran, Hao Su, Huazhe Xu, and
     general in-hand object re-orientation. In CoRL, 2022.             Xiaolong Wang. On pre-training for visuo-motor control:
 [7] Tao Chen, Megha Tippur, Siyang Wu, Vikash Kumar,                  Revisiting a learning-from-scratch baseline. In Interna-
     Edward Adelson, and Pulkit Agrawal. Visual dexter-                tional Conference on Machine Learning (ICML), 2022.
     ity: In-hand reorientation of novel and complex object       [21] Nicklas Hansen, Yixin Lin, Hao Su, Xiaolong Wang,
     shapes. Science Robotics, 8(84):eadc9244, 2023. doi:              Vikash Kumar, and Aravind Rajeswaran. Modem: Accel-
     10.1126/scirobotics.adc9244.                                      erating visual model-based reinforcement learning with
 [8] Yuanpei Chen, Tianhao Wu, Shengjie Wang, Xidong                   demonstrations. In ICLR, 2023.
     Feng, Jiechuan Jiang, Zongqing Lu, Stephen McAleer,          [22] Nicklas Hansen, Hao Su, and Xiaolong Wang. Td-mpc2:
     Hao Dong, Song-Chun Zhu, and Yaodong Yang. Towards                Scalable, robust world models for continuous control.
     human-level bimanual dexterous manipulation with rein-            arXiv, 2023.
     forcement learning. NeurIPS, 2022.                           [23] Jonathan Ho, Ajay Jain, and Pieter Abbeel. Denoising
 [9] Yuanpei Chen, Chen Wang, Li Fei-Fei, and C Karen                  diffusion probabilistic models. NeurIPS, 2020.
     Liu. Sequential dexterity: Chaining dexterous policies       [24] Binghao Huang, Yuanpei Chen, Tianyu Wang, Yuzhe
     for long-horizon manipulation. CoRL, 2023.                        Qin, Yaodong Yang, Nikolay Atanasov, and Xiaolong
[10] Cheng Chi, Siyuan Feng, Yilun Du, Zhenjia Xu, Eric                Wang. Dynamic handover: Throw and catch with bi-
     Cousineau, Benjamin Burchfiel, and Shuran Song. Dif-              manual hands. CoRL, 2023.
     fusion policy: Visuomotor policy learning via action         [25] Tao Huang, Guangqi Jiang, Yanjie Ze, and Huazhe Xu.
     diffusion. RSS, 2023.                                             Diffusion reward: Learning rewards via conditional video
[11] Pete Florence, Corey Lynch, Andy Zeng, Oscar A                    diffusion. arXiv, 2023.
     Ramirez, Ayzaan Wahid, Laura Downs, Adrian Wong,             [26] Zhiao Huang, Yuanming Hu, Tao Du, Siyuan Zhou,
     Johnny Lee, Igor Mordatch, and Jonathan Tompson.                  Hao Su, Joshua B Tenenbaum, and Chuang Gan. Plas-
     Implicit behavioral cloning. In CoRL, 2022.                       ticinelab: A soft-body manipulation benchmark with dif-
[12] Zipeng Fu, Tony Z. Zhao, and Chelsea Finn. Mobile                 ferentiable physics. arXiv, 2021.
     aloha: Learning bimanual mobile manipulation with low-       [27] Michael Janner, Yilun Du, Joshua B Tenenbaum, and
     cost whole-body teleoperation. In arXiv, 2024.                    Sergey Levine. Planning with diffusion for flexible
[13] Theophile Gervet, Zhou Xian, Nikolaos Gkanatsios, and             behavior synthesis. arXiv, 2022.
     Katerina Fragkiadaki. Act3d: Infinite resolution action      [28] Tsung-Wei Ke, Nikolaos Gkanatsios, and Katerina
     detection transformer for robotic manipulation. arXiv             Fragkiadaki. 3d diffuser actor: Policy diffusion with 3d
     preprint arXiv:2306.17817, 2023.                                  scene representations. Arxiv, 2024.
[14] Ankit Goyal, Jie Xu, Yijie Guo, Valts Blukis, Yu-Wei         [29] Bernhard Kerbl, Georgios Kopanas, Thomas Leimkühler,
     Chao, and Dieter Fox. Rvt: Robotic view transformer               and George Drettakis. 3d gaussian splatting for real-time
     for 3d object manipulation. arXiv, 2023.                          radiance field rendering. ACM Transactions on Graphics,
[15] Huy Ha, Pete Florence, and Shuran Song. Scaling up and            2023.
     distilling down: Language-guided robot skill acquisition.    [30] Kun Lei, Zhengmao He, Chenhao Lu, Kaizhe Hu, Yang
     In Conference on Robot Learning. PMLR, 2023.                      Gao, and Huazhe Xu. Uni-o4: Unifying online and offline
[16] Siddhant Haldar, Jyothish Pari, Anant Rai, and Lerrel             deep reinforcement learning with multi-step on-policy
     Pinto. Teach a robot to fish: Versatile imitation from one        optimization. arXiv, 2023.
     minute of demonstrations. RSS, 2023.                         [31] Sizhe Li, Zhiao Huang, Tao Chen, Tao Du, Hao Su,
[17] Ankur Handa, Karl Van Wyk, Wei Yang, Jacky Liang,                 Joshua B Tenenbaum, and Chuang Gan. Dexdeform:
     Yu-Wei Chao, Qian Wan, Stan Birchfield, Nathan Ratliff,           Dexterous deformable object manipulation with human
     and Dieter Fox. Dexpilot: Vision-based teleoperation              demonstrations and differentiable physics. arXiv, 2023.
     of dexterous robotic hand-arm system. In 2020 IEEE           [32] Cheng Lu, Yuhao Zhou, Fan Bao, Jianfei Chen, Chongx-
     International Conference on Robotics and Automation               uan Li, and Jun Zhu. Dpm-solver++: Fast solver for
     (ICRA). IEEE, 2020.                                               guided sampling of diffusion probabilistic models. arXiv,
[18] Ankur Handa, Arthur Allshire, Viktor Makoviychuk,                 2022.
     Aleksei Petrenko, Ritvik Singh, Jingzhou Liu, Denys          [33] Yecheng Jason Ma, William Liang, Guanzhi Wang, De-
     Makoviichuk, Karl Van Wyk, Alexander Zhurkevich,                  An Huang, Osbert Bastani, Dinesh Jayaraman, Yuke Zhu,
     Balakumar Sundaralingam, et al. Dextreme: Transfer of             Linxi Fan, and Anima Anandkumar. Eureka: Human-
     agile in-hand manipulation from simulation to reality. In         level reward design via coding large language models.
     ICRA, 2023.                                                       arXiv, 2023.
[19] Nicklas Hansen, Hao Su, and Xiaolong Wang. Stabilizing       [34] Viktor Makoviychuk, Lukasz Wawrzyniak, Yunrong
     deep q-learning with convnets and vision transformers             Guo, Michelle Lu, Kier Storey, Miles Macklin, David
     under data augmentation. Advances in neural information           Hoeller, Nikita Rudin, Arthur Allshire, Ankur Handa,
     processing systems, 2021.                                         et al. Isaac gym: High performance gpu-based physics
[20] Nicklas Hansen, Zhecheng Yuan, Yanjie Ze, Tongzhou                simulation for robot learning. arXiv, 2021.
[35] Ajay Mandlekar, Danfei Xu, Josiah Wong, Soroush                     Giulia Vezzani, John Schulman, Emanuel Todorov, and
     Nasiriany, Chen Wang, Rohun Kulkarni, Li Fei-Fei,                   Sergey Levine. Learning complex dexterous manipula-
     Silvio Savarese, Yuke Zhu, and Roberto Martı́n-Martı́n.             tion with deep reinforcement learning and demonstra-
     What matters in learning from offline human demonstra-              tions. arXiv, 2017.
     tions for robot manipulation. arXiv, 2021.                     [50] Moritz Reuss, Maximilian Li, Xiaogang Jia, and Rudolf
[36] Ben Mildenhall, Pratul P Srinivasan, Matthew Tancik,                Lioutikov.     Goal-conditioned imitation learning us-
     Jonathan T Barron, Ravi Ramamoorthi, and Ren Ng.                    ing score-based diffusion policies.       arXiv preprint
     Nerf: Representing scenes as neural radiance fields for             arXiv:2304.02532, 2023.
     view synthesis. Communications of the ACM, 2021.               [51] Robin Rombach, Andreas Blattmann, Dominik Lorenz,
[37] Felipe Nuti, Tim Franzmeyer, and João F Henriques.                 Patrick Esser, and Björn Ommer. High-resolution image
     Extracting reward functions from diffusion models. arXiv            synthesis with latent diffusion models. In Proceedings
     preprint arXiv:2306.01804, 2023.                                    of the IEEE/CVF conference on computer vision and
[38] Jyothish Pari, Nur Muhammad Shafiullah, Sridhar Pan-                pattern recognition, 2022.
     dian Arunachalam, and Lerrel Pinto. The surprising ef-         [52] Kallol Saha, Vishal Mandadi, Jayaram Reddy, Ajit
     fectiveness of representation learning for visual imitation.        Srikanth, Aditya Agarwal, Bipasha Sen, Arun Singh,
     arXiv preprint arXiv:2112.01511, 2021.                              and Madhava Krishna. Edmp: Ensemble-of-costs-guided
[39] Tim Pearce, Tabish Rashid, Anssi Kanervisto, Dave                   diffusion for motion planning. arXiv, 2023.
     Bignell, Mingfei Sun, Raluca Georgescu, Sergio Valcar-         [53] John Schulman, Filip Wolski, Prafulla Dhariwal, Alec
     cel Macua, Shan Zheng Tan, Ida Momennejad, Katja                    Radford, and Oleg Klimov. Proximal policy optimization
     Hofmann, et al. Imitating human behaviour with dif-                 algorithms. arXiv preprint arXiv:1707.06347, 2017.
     fusion models. ICLR, 2023.                                     [54] Mingyo Seo, Steve Han, Kyutae Sim, Seung Hyeon
[40] Xue Bin Peng, Erwin Coumans, Tingnan Zhang, Tsang-                  Bang, Carlos Gonzalez, Luis Sentis, and Yuke Zhu.
     Wei Lee, Jie Tan, and Sergey Levine. Learning agile                 Deep imitation learning for humanoid loco-manipulation
     robotic locomotion skills by imitating animals. arXiv,              through human teleoperation. Humanoids, 2023.
     2020.                                                          [55] Younggyo Seo, Danijar Hafner, Hao Liu, Fangchen Liu,
[41] Aaditya Prasad, Kevin Lin, Jimmy Wu, Linqi Zhou, and                Stephen James, Kimin Lee, and Pieter Abbeel. Masked
     Jeannette Bohg. Consistency policy: Accelerated visuo-              world models for visual control. In CoRL, 2023.
     motor policies via consistency distillation. In Robotics:      [56] Nur Muhammad Shafiullah, Zichen Cui, Ariuntuya Arty
     Science and Systems, 2024.                                          Altanzaya, and Lerrel Pinto. Behavior transformers:
[42] Charles R Qi, Hao Su, Kaichun Mo, and Leonidas J                    Cloning k modes with one stone. Advances in neural
     Guibas. Pointnet: Deep learning on point sets for 3d                information processing systems, 2022.
     classification and segmentation. In CVPR, 2017.                [57] Nur Muhammad Mahi Shafiullah, Anant Rai, Haritheja
[43] Charles Ruizhongtai Qi, Li Yi, Hao Su, and Leonidas J               Etukuru, Yiqian Liu, Ishan Misra, Soumith Chintala, and
     Guibas. Pointnet++: Deep hierarchical feature learning              Lerrel Pinto. On bringing robots home. arXiv, 2023.
     on point sets in a metric space. NeurIPS, 2017.                [58] William Shen, Ge Yang, Alan Yu, Jansen Wong,
[44] Haozhi Qi, Ashish Kumar, Roberto Calandra, Yi Ma, and               Leslie Pack Kaelbling, and Phillip Isola. Distilled feature
     Jitendra Malik. In-hand object rotation via rapid motor             fields enable few-shot language-guided manipulation.
     adaptation. In CoRL, 2023.                                          arXiv preprint arXiv:2308.07931, 2023.
[45] Haozhi Qi, Brent Yi, Sudharshan Suresh, Mike Lambeta,          [59] Haochen Shi, Huazhe Xu, Samuel Clarke, Yunzhu Li,
     Yi Ma, Roberto Calandra, and Jitendra Malik. General                and Jiajun Wu. Robocook: Long-horizon elasto-plastic
     in-hand object rotation with vision and touch. In CoRL,             object manipulation with diverse tools. Proceedings of
     2023.                                                               the 7th Conference on Robot Learning (CoRL), 2023.
[46] Guocheng Qian, Yuchen Li, Houwen Peng, Jinjie Mai,             [60] Mohit Shridhar, Lucas Manuelli, and Dieter Fox.
     Hasan Hammoud, Mohamed Elhoseiny, and Bernard                       Perceiver-actor: A multi-task transformer for robotic ma-
     Ghanem. Pointnext: Revisiting pointnet++ with improved              nipulation. In CoRL, 2023.
     training and scaling strategies. NeurIPS, 2022.                [61] Anthony Simeonov, Ankit Goyal, Lucas Manuelli, Lin
[47] Yuzhe Qin, Yueh-Hua Wu, Shaowei Liu, Hanwen Jiang,                  Yen-Chen, Alina Sarmiento, Alberto Rodriguez, Pulkit
     Ruihan Yang, Yang Fu, and Xiaolong Wang. Dexmv: Im-                 Agrawal, and Dieter Fox. Shelving, stacking, hanging:
     itation learning for dexterous manipulation from human              Relational pose diffusion for multi-modal rearrangement.
     videos. In ECCV, 2022.                                              arXiv preprint arXiv:2307.04751, 2023.
[48] Yuzhe Qin, Wei Yang, Binghao Huang, Karl Van Wyk,              [62] Jiaming Song, Chenlin Meng, and Stefano Ermon. De-
     Hao Su, Xiaolong Wang, Yu-Wei Chao, and Dietor                      noising diffusion implicit models. ICLR, 2021.
     Fox.     Anyteleop: A general vision-based dexterous           [63] Yang Song, Jascha Sohl-Dickstein, Diederik P Kingma,
     robot arm-hand teleoperation system. arXiv preprint                 Abhishek Kumar, Stefano Ermon, and Ben Poole. Score-
     arXiv:2307.04577, 2023.                                             based generative modeling through stochastic differential
[49] Aravind Rajeswaran, Vikash Kumar, Abhishek Gupta,                   equations. ICLR, 2021.
[64] Kaustubh Sridhar, Souradeep Dutta, Dinesh Jayaraman,                and Xiaolong Wang. Robot synesthesia: In-hand manip-
     James Weimer, and Insup Lee. Memory-consistent neural               ulation with visuotactile sensing. arXiv, 2023.
     networks for imitation learning. In The Twelfth Inter-         [79] Zhecheng Yuan, Zhengrong Xue, Bo Yuan, Xueqian
     national Conference on Learning Representations, 2024.              Wang, Yi Wu, Yang Gao, and Huazhe Xu. Pre-trained
     URL https://openreview.net/forum?id=R3Tf7LDdX4.                     image encoder for generalizable visual reinforcement
[65] Emanuel Todorov, Tom Erez, and Yuval Tassa. Mujoco:                 learning. Advances in Neural Information Processing
     A physics engine for model-based control. In IROS,                  Systems, 2022.
     2012.                                                          [80] Yanjie Ze, Nicklas Hansen, Yinbo Chen, Mohit Jain,
[66] Julen Urain, Niklas Funk, Jan Peters, and Georgia Chal-             and Xiaolong Wang. Visual reinforcement learning with
     vatzaki. Se (3)-diffusionfields: Learning smooth cost               self-supervised 3d representations. IEEE Robotics and
     functions for joint grasp and motion optimization through           Automation Letters, 2023.
     diffusion. In 2023 IEEE International Conference on            [81] Yanjie Ze, Yuyao Liu, Ruizhe Shi, Jiaxin Qin, Zhecheng
     Robotics and Automation (ICRA). IEEE, 2023.                         Yuan, Jiashun Wang, and Huazhe Xu. H-index: Visual re-
[67] Che Wang, Xufang Luo, Keith Ross, and Dongsheng                     inforcement learning with hand-informed representations
     Li. Vrl3: A data-driven framework for visual deep                   for dexterous manipulation. In Annual Conference on
     reinforcement learning. Advances in Neural Information              Neural Information Processing Systems (NeurIPS), 2023.
     Processing Systems, 2022.                                      [82] Yanjie Ze, Ge Yan, Yueh-Hua Wu, Annabella Macaluso,
[68] Chen Wang, Linxi Fan, Jiankai Sun, Ruohan Zhang,                    Yuying Ge, Jianglong Ye, Nicklas Hansen, Li Erran
     Li Fei-Fei, Danfei Xu, Yuke Zhu, and Anima Anand-                   Li, and Xiaolong Wang. Gnfactor: Multi-task real
     kumar. Mimicplay: Long-horizon imitation learning by                robot learning with generalizable neural feature fields.
     watching human play. CoRL, 2023.                                    Proceedings of the 7th Conference on Robot Learning
[69] Chen Wang, Haochen Shi, Weizhuo Wang, Ruohan                        (CoRL), 2023.
     Zhang, Li Fei-Fei, and C Karen Liu. Dexcap: Scalable           [83] Gu Zhang, Hao-Shu Fang, Hongjie Fang, and Cewu Lu.
     and portable mocap data collection system for dexterous             Flexible handover with real-time robust dynamic grasp
     manipulation. arXiv preprint arXiv:2403.07788, 2024.                trajectory generation. In 2023 IEEE/RSJ International
[70] Zhendong Wang, Jonathan J Hunt, and Mingyuan Zhou.                  Conference on Intelligent Robots and Systems (IROS),
     Diffusion policies as an expressive policy class for offline        2023.
     reinforcement learning. ICLR, 2023.                            [84] Hengshuang Zhao, Li Jiang, Jiaya Jia, Philip HS Torr,
[71] Tianhao Wu, Mingdong Wu, Jiyao Zhang, Yunchong                      and Vladlen Koltun. Point transformer. In ICCV, 2021.
     Gan, and Hao Dong. Learning score-based grasping               [85] Yuke Zhu, Josiah Wong, Ajay Mandlekar, Roberto
     primitive for human-assisting dexterous grasping. In                Martı́n-Martı́n, Abhishek Joshi, Soroush Nasiriany, and
     NeurIPS, 2023.                                                      Yifeng Zhu. robosuite: A modular simulation frame-
[72] Zhou Xian, Nikolaos Gkanatsios, Theophile Gervet,                   work and benchmark for robot learning. arXiv preprint
     Tsung-Wei Ke, and Katerina Fragkiadaki. Chaineddif-                 arXiv:2009.12293, 2020.
     fuser: Unifying trajectory diffusion and keypose predic-
     tion for robotic manipulation. In CoRL, 2023.
[73] Fanbo Xiang, Yuzhe Qin, Kaichun Mo, Yikuan Xia, Hao
     Zhu, Fangchen Liu, Minghua Liu, Hanxiao Jiang, Yifu
     Yuan, He Wang, et al. Sapien: A simulated part-based
     interactive environment. In CVPR, 2020.
[74] Ge Yan, Yueh-Hua Wu, and Xiaolong Wang. NeRFuser:
     Diffusion guided multi-task 3d policy learning, 2024.
     URL https://openreview.net/forum?id=8GmPLkO0oR.
[75] Sizhe Yang, Yanjie Ze, and Huazhe Xu. Movie: Visual
     model-based policy adaptation for view generalization.
     Annual Conference on Neural Information Processing
     Systems (NeurIPS), 2023.
[76] Zhao-Heng Yin, Binghao Huang, Yuzhe Qin, Qifeng
     Chen, and Xiaolong Wang. Rotating without seeing:
     Towards in-hand dexterity through touch. RSS, 2023.
[77] Tianhe Yu, Deirdre Quillen, Zhanpeng He, Ryan Julian,
     Karol Hausman, Chelsea Finn, and Sergey Levine. Meta-
     world: A benchmark and evaluation for multi-task and
     meta reinforcement learning. In CoRL, 2020.
[78] Ying Yuan, Haichuan Che, Yuzhe Qin, Binghao Huang,
     Zhao-Heng Yin, Kang-Won Lee, Yi Wu, Soo-Chul Lim,
                                                          A PPENDIX
A. Implementation Details
  DP3 mainly consists of two parts: perception and decision. We now detail the implementation details of each part as follows.
The official implementation of DP3 is available on https://github.com/YanjieZe/3D-Diffusion-Policy.
Perception. The input of DP3 includes the visual observation and the robot pose. The visual observation is a point cloud
without colors, downsampled from the raw point cloud using Farthest Point Sampling (FPS). We use 512 or 1024 in all the
simulated and real-world tasks. DP3 encodes the point cloud into a compact representation with our designed DP3 Encoder.
We provide a simple PyTorch implementation of our DP3 Encoder as follows:
class DP3Encoder(nn.Module):
   def __init__(self, channels=3):
      # We only use xyz (channels=3) in this work
      # while our encoder also works for xyzrgb (channels=6) in our experiments
      self.mlp = nn.Sequential(
            nn.Linear(channels, 64), nn.LayerNorm(64), nn.ReLU(),
            nn.Linear(64, 128), nn.LayerNorm(128), nn.ReLU(),
            nn.Linear(128, 256), nn.LayerNorm(256), nn.ReLU())
      self.projection = nn.Sequential(nn.Linear(256, 64), nn.LayerNorm(64))

    def forward(self, x):
       # x: B, N, 3
       x = self.mlp(x) # B, N, 256
       x = torch.max(x, 1)[0] # B, 256
       x = self.projection(x) # B, 64
       return x

The robot poses are also processed by an MLP network described as follows:
# DimRobo is the dimension of the robot poses.
Sequential(
  (0): Linear(in_features=DimRobo, out_features=64, bias=True)
  (1): ReLU()
  (2): Linear(in_features=64, out_features=64, bias=True))

The representations encoded from point clouds and robot poses are concatenated into one representation of dimension 128.
Afterward, the decision backbone generates actions conditioning on this representation.
Decision. The decision backbone is a convolutional network-based diffusion policy, which transforms random Gaussian noise
into a coherent sequence of actions. For implementation, we utilize the official PyTorch framework available from [10]. In
practice, the model is designed to predict a series of H actions based on Nobs observed timesteps, but it will only execute the
last Nact actions during inference. We set H = 4, Nobs = 2, Nact = 3 for DP3 and diffusion-based baselines.
   The original Diffusion Policy typically employs a longer horizon, primarily due to the denser nature of the timesteps in their
tasks. In Table XV, we show that there is no significant difference between a short horizon and a long horizon for our tasks.
Moreover, considering the potential for sudden disruptions in real-world robotic operations, we choose to employ a shorter
horizon.
Normalization. We scale the min and max of each action dimension and each observation dimension to [−1, 1] independently.
Normalizing the actions to [−1, 1] is a must for the prediction of DDPM and DDIM since they would clip the prediction to
[−1, 1] for stability.

B. Task Suite
Simulated tasks. We collect diverse simulated tasks to systematically evaluate imitation learning algorithms. Our collected tasks
mainly focus on robotic manipulation, including Adroit [49], Bi-DexHands [8], DexArt [5], DexDeform [31], DexMV [47],
HORA [44], and MetaWorld [77]. The full task names could be seen in Table XVIII. We add the support for 3D modality in
these tasks when the 3D modality is not available originally.
Real-world tasks. The episode length for our real-world tasks is not fixed. Average episode lengths for demonstrations of each
task are listed as follows: (1) 79.9 for Roll-Up; (2) 113.5 for Dumpling; (3) 71.4 for Drill; and (4) 83.6 for Pour. During the
evaluation of the policy, we stop the robot when we find (1) the policy finishes the task; (2) the policy can not successfully
handle the task; and (3) the policy makes behaviors that are harmful to the hardware. Our real-world setup and everyday objects
used in our tasks are shown in Figure 8. The randomization in each task is shown in Figure 9. For Roll-Up and Dumpling,
the plasticine’s shape and the appearance of the objects placed upon the plasticine are randomized. For Drill and Pour, the
variations come from the random positions of the cube, drill, and bowl.
C. More Simulation Experiments
Simulation results for each task. We give the simulation results for each task in Table XVIII, which is supplementary to
Table I in our main paper. We report average success rates across 3 seeds. For HORA, we report the normalized returns since
this task is doing in-hand rotation and is not measured by success rates.
Success rates for experts. In our simulated tasks, we apply Reinforcement Learning (RL)-trained agents to generate
demonstrations. These expert policies are rigorously evaluated over 200 episodes, and their success rates are detailed in
Table XIX. For MetaWorld tasks, we present results from scripted policies.
Choice of prediction horizon. DP3 applies a short action prediction and execution horizon H = 4, Nact = 3, and so does
the baseline Diffusion Policy. This is mainly designed for the generality of DP3 in complex tasks and real robot tasks, where
the environment would be changed by human intervention and the policy needs to switch action immediately. As shown in
Table XV, a shortened prediction horizon is competitive with a longer one.
TABLE XV: Ablation on prediction horizon. In this work, DP3 and Diffusion Policy uses a prediction horizon H = 4, Nact =
3. We test H = 16, Nact = 8 originally used in [10] for both methods.
                          Algorithm                 H           D         P            A          DA           SP         Average
                          DP3                  100±0         62±4      43±6       99±1            69±4        97±4            78.3
                          w/ long horizon      100±0         64±5      46±3       99±1            75±3        85±14           78.2
                          Diffusion Policy     48±17         50±5      25±4       15±1            43±7        63±3            40.7
                          w/ long horizon      68±11         44±4      16±2       12±3            14±1        44±5            33.0


D. Simple DP3                                                                                             Accuracy (Avg Success)30 Inference Speed (FPS)
                                                                                                         80            74.4
   To enhance the applicability of DP3 in real-world robot learning, we simplify                                                 70.2                           25.3
the policy backbone of DP3, which is identified as one critical factor that                              60
                                                                                                                                        20
impacts inference speed. The refined version, dubbed Simple DP3, offers 2x                                     44.0
                                                                                                         40                                    12.3      12.7
inference speed while maintaining high accuracy, as shown in Table XVI.                                                                 10
The efficiency stems from removing the redundant components in the UNet                                  20
backbone. The implementation of Simple DP3 is available on https://github.                                0                              0
com/YanjieZe/3D-Diffusion-Policy.                                                                                 Diffusion Policy           DP3          Simple DP3

TABLE XVI: Results of Simple DP3. Compared to DP3, Simple DP3 achieves nearly 2x inference speed without losing much
accuracy. Full evaluation results are given in Table XVII.
                                      Algorithm                     Diffusion Policy       DP3      Simple DP3
                                      Inference Speed (FPS)              12.3              12.7     25.3 (↑ 99%)
                                      Accuracy (Avg Success)             44.0              74.4      70.2 (↓ 6%)

TABLE XVII: Full evaluation results of Simple DP3. We evaluate Simple DP3 on 10 tasks and compare it with DP3 and
find that Simple DP3 could achieve results very competitive to DP3.
                                   Adroit                            MetaWorld                                        DexArt
       Algorithm \ Task   Hammer    Door     Pen        Assembly    Disassemble    Stick-Push       Laptop        Faucet  Toilet        Bucket        Average
       DP3                100±0     62±4     43±6        99±1          69±4            97±4          83±1         63±2        82±4      46±2           74.4
       Diffusion Policy   48±17     50±5     25±4        15±1          43±7            63±3          69±4         23±8        58±2      46±1           44.0
       Simple DP3         100±0     58±4     46±5        79±1          50±3            97±5          84±2         63±3        81±6      44±6           70.2
TABLE XVIII: Main results on 72 simulation tasks. Results for each task are provided in this table. A summary across
domains is shown in Table I.

                          Adroit [49]                                                                Bi-DexHands [8]
 Alg \ Task          Hammer  Door                Pen      Block Stack         Bottle Cap     Door Open Outward Grasp And Place                 Hand Over         Scissors
 DP3                  100±0         62±4       43±6            24±15           83±10                100±0                    69±22               45±8            100±0
 Diffusion Policy      45±5         37±2       13±2             4±4             61±5                100±0                     65±9               38±0            100±0
                                  DexArt [5]                                         DexDeform [31]                                   DexMV [47]            HORA [44]
 Alg \ Task         Laptop      Faucet  Toilet     Bucket       Rope      Bun       Dumpling  Wrap           Flip    Folding       Pour   Place Inside       Rotation
 DP3                83±1        63±2     82±4       46±2        93±2    70±9          92±0       94±0       97±1      81±2        99±2        100±0            71±31
 Diffusion Policy   69±4        23±8     58±2       46±1        97±0    76±4          92±0       91±0       99±0      88±1        90±2        100±0            49±11
                                                                               Meta-World [77] (Easy)
 Alg \ Task         Button Press       Button Press Topdown       Button Press Topdown Wall Button Press Wall              Coffee Button      Dial Turn      Door Close
 DP3                   100±0                   100±0                           99±2                         99±1               100±0            66±1             100±0
 Diffusion Policy       99±1                    98±1                           96±3                         97±3                99±1            63±10            100±0
                                                                                   Meta-World (Easy)
 Alg \ Task         Door Lock      Door Open      Door Unlock      Drawer Close     Drawer Open    Faucet Close        Faucet Open       Handle Press     Handle Pull
 DP3                  98±2           99±1              100±0           100±0            100±0           100±0              100±0            100±0           53±11
 Diffusion Policy     86±8           98±3               98±3           100±0             93±3           100±0              100±0             81±4           27±22
                                                                                     Meta-World (Easy)
 Alg \ Task         Handle Press Side      Handle Pull Side      Lever Pull     Plate Slide Plate Slide Back        Plate Slide Back Side     Plate Slide Side     Reach
 DP3                    100±0                    85±3              79±8           100±1             99±0                   100±0                    100±0          24±1
 Diffusion Policy       100±0                    23±17             49±5            83±4             99±0                   100±0                    100±0          18±2
                                          Meta-World (Easy)                                                            Meta-World (Medium)
 Alg \ Task         Reach Wall     Window Close Window Open               Peg Unplug Side      Basketball     Bin Picking Box Close Coffee Pull             Coffee Push
 DP3                  68±3              100±0              100±0                75±5             98±2           34±30          42±3            87±3              94±3
 Diffusion Policy     59±7              100±0              100±0                74±3             85±6            15±4          30±5            34±7              67±4
                                               Meta-World (Medium)                                                          Meta-World (Hard)
 Alg \ Task         Hammer       Peg Insert Side   Push Wall Soccer             Sweep      Sweep Into   Assembly       Hand Insert Pick Out of Hole           Pick Place
 DP3                 76±4              69±7              49±8       18±3        96±3         15±5           99±1           14±4               14±9               12±4
 Diffusion Policy    15±6              34±7              20±3       14±4        18±8         10±4           15±1            9±2                0±0                0±0

                        Meta-World (Hard)                                         Meta-World (Very Hard)
                                                                                                                                                          Average
 Alg \ Task             Push   Push Back                 Shelf Place      Disassemble  Stick Pull  Stick Push                     Pick Place Wall
 DP3                    51±3             0±0              17±10                69±4              27±8               97±4               35±8                 74.4
 Diffusion Policy       30±3             0±0               11±3                43±7              11±2               63±3                5±1                 59.8
TABLE XIX: Success rates of experts on 72 simulation tasks. We evaluate 200 episodes for each task. For MetaWorld tasks,
we evaluate both BAC agents and the script policies provided officially in MetaWorld. For DexDeform tasks, the demonstrations
are collected by human teleportation [31] and we record the success rates as 100%.
                    Adroit [49]                                                                             Bi-DexHands [8]
 Alg \ Task    Hammer   Door                  Pen       Block Stack           Bottle Cap            Door Open Outward Grasp And Place                      Hand Over         Scissors
 Expert          99.0           100.0         97.0            83.5              100.0                        100.0                          100.0             77.0            99.5
                            DexArt [5]                                                   DexDeform [31]                                            DexMV [47]          HORA [44]
 Alg \ Task   Laptop      Faucet  Toilet            Bucket      Rope          Bun       Dumpling  Wrap                 Flip      Folding        Pour  Place Inside      Rotation
 Expert        86.5        58.0         66.5          80.0      100.0        100.0           100.0          100.0     100.0          100.0      88.5       64.5              80.5
                                                                                  Meta-World [77] (Easy)
 Alg \ Task   Button Press        Button Press Topdown               Button Press Topdown Wall   Button Press Wall                      Coffee Button     Dial Turn    Door Close
 Expert          100.0                        100.0                              100.0                               98.5                    100.0          100.0            100.0
                                                                                   Meta-World (Easy)
 Alg \ Task   Door Lock        Door Open         Door Unlock          Drawer Close  Drawer Open Faucet Close                           Faucet Open      Handle Press   Handle Pull
 Expert         100.0             98.5                 100.0                 100.0              100.0                 100.0                 100.0          100.0             100.0
                                                                                          Meta-World (Easy)
 Alg \ Task   Handle Press Side         Handle Pull Side         Lever Pull          Plate Slide Plate Slide Back              Plate Slide Back Side      Plate Slide Side     Reach
 Expert               100.0                    100.0                  98.5             100.0                 100.0                      100.0                  100.0           100.0
                                       Meta-World (Easy)                                                                        Meta-World (Medium)
 Alg \ Task   Reach Wall        Window Close Window Open                     Peg Unplug Side          Basketball       Bin Picking   Box Close Coffee Pull             Coffee Push
 Expert         100.0                 100.0                  100.0                   99.0               100.0                 97.0             90.0        100.0             100.0
                                            Meta-World (Medium)                                                                           Meta-World (Hard)
 Alg \ Task   Hammer          Peg Insert Side   Push Wall  Soccer                Sweep         Sweep Into           Assembly         Hand Insert Pick Out of Hole        Pick Place
 Expert        100.0              92.0                 100.0           90.5          100.0           90.0            100.0             100.0              100.0              100.0
              Meta-World (Hard)                                          Meta-World (Very Hard)
 Alg \ Task   Push   Push Back                 Shelf Place       Disassemble Stick Pull Stick Push                            Pick Place Wall
 Expert       100.0             0.0                  99.5              92.5                  95.0            100.0                   99.5
