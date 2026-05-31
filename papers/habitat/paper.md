                                                                       Habitat: A Platform for Embodied AI Research

                                                          Manolis Savva1,4 *, Abhishek Kadian1 *, Oleksandr Maksymets1 *, Yili Zhao1 ,
                                                          Erik Wijmans1,2,3 , Bhavana Jain1 , Julian Straub2 , Jia Liu1 , Vladlen Koltun5 ,
                                                                      Jitendra Malik1,6 , Devi Parikh1,3 , Dhruv Batra1,3
                                                      1
                                                          Facebook AI Research, 2 Facebook Reality Labs, 3 Georgia Institute of Technology,




arXiv:1904.01201v2 [cs.CV] 25 Nov 2019
                                                                      4
                                                                        Simon Fraser University, 5 Intel Labs, 6 UC Berkeley
                                                                                 https://aihabitat.org
                                                                                                          1. Introduction
                                                                     Abstract
                                                                                                          The embodiment hypothesis is the idea that intelligence emerges
                                                                                                          in the interaction of an agent with an environment and as a result
                                             We present Habitat, a platform for research in embodied      of sensorimotor activity.
                                         artificial intelligence (AI). Habitat enables training embod-                                              Smith and Gasser [26]
                                         ied agents (virtual robots) in highly efficient photorealistic
                                         3D simulation. Specifically, Habitat consists of:
                                                                                                              Imagine walking up to a home robot and asking ‘Hey –
                                         (i) Habitat-Sim: a flexible, high-performance 3D sim-
                                                                                                          can you go check if my laptop is on my desk? And if so, bring
                                         ulator with configurable agents, sensors, and generic 3D
                                                                                                          it to me.’ In order to be successful, such a robot would need
                                         dataset handling. Habitat-Sim is fast – when rendering
                                                                                                          a range of skills – visual perception (to recognize scenes and
                                         a scene from Matterport3D, it achieves several thousand
                                                                                                          objects), language understanding (to translate questions and
                                         frames per second (fps) running single-threaded, and can
                                                                                                          instructions into actions), and navigation in complex environ-
                                         reach over 10,000 fps multi-process on a single GPU.
                                                                                                          ments (to move and find things in a changing environment).
                                         (ii) Habitat-API: a modular high-level library for end-to-
                                                                                                              While there has been significant progress in the vision
                                         end development of embodied AI algorithms – defining tasks
                                                                                                          and language communities thanks to recent advances in deep
                                         (e.g. navigation, instruction following, question answering),
                                                                                                          representations [14, 11], much of this progress has been
                                         configuring, training, and benchmarking embodied agents.
                                                                                                          on ‘internet AI’ rather than embodied AI. The focus of the
                                             These large-scale engineering contributions enable us to     former is pattern recognition in images, videos, and text on
                                         answer scientific questions requiring experiments that were      datasets typically curated from the internet [10, 18, 4]. The
                                         till now impracticable or ‘merely’ impractical. Specifically,    focus of the latter is to enable action by an embodied agent
                                         in the context of point-goal navigation: (1) we revisit the      (e.g. a robot) in an environment. This brings to the fore active
                                         comparison between learning and SLAM approaches from             perception, long-term planning, learning from interaction,
                                         two recent works [20, 16] and find evidence for the oppo-        and holding a dialog grounded in an environment.
                                         site conclusion – that learning outperforms SLAM if scaled           A straightforward proposal is to train agents directly in
                                         to an order of magnitude more experience than previous           the physical world – exposing them to all its richness. This
                                         investigations, and (2) we conduct the first cross-dataset       is valuable and will continue to play an important role in the
                                         generalization experiments {train, test} × {Matterport3D,        development of AI. However, we also recognize that train-
                                         Gibson} for multiple sensors {blind, RGB, RGBD, D} and           ing robots in the real world is slow (the real world runs no
                                         find that only agents with depth (D) sensors generalize across   faster than real time and cannot be parallelized), dangerous
                                         datasets. We hope that our open-source platform and these        (poorly-trained agents can unwittingly injure themselves, the
                                         findings will advance research in embodied AI.                   environment, or others), resource intensive (the robot(s) and
                                                                                                          the environment(s) in which they execute demand resources
                                                                                                          and time), difficult to control (it is hard to test corner-case
                                                                                                          scenarios as these are, by definition, infrequent and chal-
                                                                                                          lenging to recreate), and not easily reproducible (replicating
                                                                                                          conditions across experiments and institutions is difficult).
                                           * Denotes equal contribution.                                      We aim to support a complementary research program:
                                                                                                                                                     Habitat Platform

    Tasks                                                                                                                                              Habitat API
                     EmbodiedQA Language grounding          Interactive QA      Vision-Language Navigation          Visual Navigation
                   (Das et al., 2018) (Hill et al., 2017) (Gordon et al., 2018)    (Anderson et al., 2018) (Zhu et al., 2017, Gupta et al., 2017)




    Simulators                                                                                                                                         Habitat Sim
                      House3D                    AI2-THOR                   MINOS                       Gibson                      CHALET
                    (Wu et al., 2017)        (Kolve et al., 2017)      (Savva et al., 2017)        (Zamir et al., 2018)         (Yan et al., 2018)




                                                                                                                                                     Generic Dataset
    Datasets                                                                                                                                            Support

                     Replica (Straub et al., 2019)           Matterport3D (Chang et al., 2017)                2D-3D-S (Armeni et al., 2017)



Figure 1: The ‘software stack’ for training embodied agents involves (1) datasets providing 3D assets with semantic annotations, (2)
simulators that render these assets and within which an embodied agent may be simulated, and (3) tasks that define evaluatable problems that
enable us to benchmark scientific progress. Prior work (highlighted in blue boxes) has contributed a variety of datasets, simulation software,
and task definitions. We propose a unified embodied agent stack with the Habitat platform, including generic dataset support, a highly
performant simulator (Habitat-Sim), and a flexible API (Habitat-API) allowing the definition and evaluation of a broad set of tasks.


training embodied agents (e.g. virtual robots) in rich realistic                                 question answering), configuring and training embodied
simulators and then transferring the learned skills to reality.                                  agents (via imitation or reinforcement learning, or via classic
Simulations have a long and rich history in science and                                          SLAM), and benchmarking using standard metrics [2].
engineering (from aerospace to zoology). In the context of                                           The Habitat architecture and implementation combine
embodied AI, simulators help overcome the aforementioned                                         modularity and high performance. When rendering a scene
challenges – they can run orders of magnitude faster than                                        from the Matterport3D dataset, Habitat-Sim achieves
real-time and can be parallelized over a cluster; training                                       several thousand frames per second (fps) running single-
in simulation is safe, cheap, and enables fair comparison                                        threaded, and can reach over 10,000 fps multi-process on
and benchmarking of progress in a concerted community-                                           a single GPU, which is orders of magnitude faster than the
wide effort. Once a promising approach has been developed                                        closest simulator. Habitat-API allows us to train and
and tested in simulation, it can be transferred to physical                                      benchmark embodied agents with different classes of meth-
platforms that operate in the real world [6, 15].                                                ods and in different 3D scene datasets.
    Datasets have been a key driver of progress in computer                                          These large-scale engineering contributions enable us to
vision, NLP, and other areas of AI [10, 18, 4, 1]. As the                                        answer scientific questions requiring experiments that were
community transitions to embodied AI, we believe that sim-                                       till now impracticable or ‘merely’ impractical. Specifically,
ulators will assume the role played previously by datasets.                                      in the context of point-goal navigation [2], we make two
To support this transition, we aim to standardize the entire                                     scientific contributions:
‘software stack’ for training embodied agents (Figure 1):                                            1. We revisit the comparison between learning and
scanning the world and creating photorealistic 3D assets, de-                                    SLAM approaches from two recent works [20, 16] and find
veloping the next generation of highly efficient and paralleliz-                                 evidence for the opposite conclusion – that learning out-
able simulators, specifying embodied AI tasks that enable                                        performs SLAM if scaled to an order of magnitude more
us to benchmark scientific progress, and releasing modu-                                         experience than previous investigations.
lar high-level libraries for training and deploying embodied                                         2. We conduct the first cross-dataset generalization exper-
agents. Specifically, Habitat consists of the following:                                         iments {train, test} × {Matterport3D, Gibson} for multiple
    1. Habitat-Sim: a flexible, high-performance 3D                                              sensors {Blind1 , RGB, RGBD, D} × {GPS+Compass} and
simulator with configurable agents, multiple sensors, and                                        find that only agents with depth (D) sensors generalize well
generic 3D dataset handling (with built-in support for Mat-                                      across datasets.
terport3D, Gibson, and Replica datasets).                                                            We hope that our open-source platform and these findings
    2. Habitat-API: a modular high-level library for end-                                        will advance and guide future research in embodied AI.
to-end development of embodied AI algorithms – defining
embodied AI tasks (e.g. navigation, instruction following,                                         1 Blind refers to agents with no visual sensory inputs.
2. Related Work
Reality is something you rise above.

                      Liza Minnelli

    The availability of large-scale 3D scene datasets [5, 27, 8]
and community interest in active vision tasks led to a recent
surge of work that resulted in the development of a variety
of simulation platforms for indoor environments [17, 7, 13,
24, 29, 3, 30, 31, 23]. These platforms vary with respect to
the 3D scene data they use, the embodied agent tasks they          Figure 2: Example rendered sensor observations for three sensors
address, and the evaluation protocols they implement.              (color camera, depth sensor, semantic instance mask) in two differ-
                                                                   ent environment datasets. A Matterport3D [8] environment is in
    This surge of activity is both thrilling and alarming. On
                                                                   the top row, and a Replica [28] environment in the bottom row.
the one hand, it is clearly a sign of the interest in embodied
AI across diverse research communities (computer vision,
natural language processing, robotics, machine learning). On       – thousands vs. one hundred frames per second – allows
the other hand, the existence of multiple differing simulation     us to evaluate agents that have been trained with signifi-
environments can cause fragmentation, replication of effort,       cantly larger amounts of experience (75 million steps vs. five
and difficulty in reproduction and community-wide progress.        million steps). The trends we observe demonstrate that
Moreover, existing simulators exhibit several shortcomings:        learned agents can begin to match and outperform classical
– Tight coupling of task (e.g. navigation), simulation plat-       approaches when provided with large amounts of training
   form (e.g. GibsonEnv), and 3D dataset (e.g. Gibson). Ex-        experience. Other recent work by Koijima and Deng [16] has
   periments with multiple tasks or datasets are impractical.      also compared hand-engineered navigation agents against
– Hard-coded agent configuration (e.g. size, action-space).        learned agents but their focus is on defining additional met-
   Ablations of agent parameters and sensor types are not          rics to characterize the performance of agents and to establish
   supported, making results hard to compare.                      measures of hardness for navigation episodes. To our knowl-
– Suboptimal rendering and simulation performance. Most            edge, our experiments are the first to train navigation agents
   existing indoor simulators operate at relatively low frame      provided with multi-month experience in realistic indoor
   rates (10-100 fps), becoming a bottleneck in training           environments and contrast them against classical methods.
   agents and making large-scale learning infeasible. Take-
   away messages from such experiments become unreliable           3. Habitat Platform
   – has the learning converged to trust the comparisons?
– Limited control of environment state. The structure of the       What I cannot create I do not understand.
   3D scene in terms of present objects cannot be program-
                                                                                         Richard Feynman
   matically modified (e.g. to test the robustness of agents).
    Most critically, work built on top of any of the existing
platforms is hard to reproduce independently from the plat-           The development of Habitat is a long-term effort to en-
form, and thus hard to evaluate against work based on a            able the formation of a common task framework [12] for
different platform, even in cases where the target tasks and       research into embodied agents, thereby supporting system-
datasets are the same. This status quo is undesirable and mo-      atic research progress in this area.
tivates the Habitat effort. We aim to learn from the successes     Design requirements. The issues discussed in the previous
of previous frameworks and develop a unifying platform that        section lead us to a set of requirements that we seek to fulfill.
combines their desirable characteristics while addressing          – Highly performant rendering engine: resource-
their limitations. A common, unifying platform can sig-               efficient rendering engine that can produce multiple chan-
nificantly accelerate research by enabling code re-use and            nels of visual information (e.g. RGB, depth, semantic
consistent experimental methodology. Moreover, a common               instance segmentation, surface normals, optical flow) for
platform enables us to easily carry out experiments testing           multiple concurrently operating agents.
agents based on different paradigms (learned vs. classical)        – Scene dataset ingestion API: makes the platform agnos-
and generalization of agents between datasets.                        tic to 3D scene datasets and allows users to use their own
    The experiments we carry out contrasting learned and              datasets.
classical approaches to navigation are similar to the recent       – Agent API: allows users to specify parameterized em-
work of Mishkin et al. [20]. However, the performance                 bodied agents with well-defined geometry, physics, and
of the Habitat stack relative to MINOS [24] used in [20]              actuation characteristics.
– Sensor suite API: allows specification of arbitrary num-                                         1 process             5 processes
    bers of parameterized sensors (e.g. RGB, depth, contact,        Sensors / Resolution    128        256     512     128     256      512
    GPS, compass sensors) attached to each agent.                   RGB                    4,093     1,987     848   10,592   3,574    2,629
– Scenario and task API: allows portable definition of              RGB + depth            2,050     1,042     423    5,223   1,774    1,348
    tasks and their evaluation protocols.
– Implementation: C++ backend with Python API and                   Table 1: Performance of Habitat-Sim in frames per second
    interoperation with common learning frameworks, mini-           for an example Matterport3D scene (id 17DRP5sb8fy) on an Intel
    mizes entry threshold.                                          Xeon E5-2690 v4 CPU and Nvidia Titan Xp GPU, measured at
– Containerization: enables distributed training in clusters        different frame resolutions and with a varying number of concur-
                                                                    rent simulator processes sharing the GPU. See the supplement for
    and remote-server evaluation of user-provided code.
                                                                    additional benchmarking results.
– Humans-as-agents: allows humans to function as agents
    in simulation in order to collect human behavior and in-
    vestigate human-agent or human-human interactions.
                                                                    three datasets by simply specifying a different input scene.
– Environment state manipulation: programmatic con-
    trol of the environment configuration in terms of the ob-       Performance. Habitat-Sim achieves thousands of
    jects that are present and their relative layout.               frames per second per simulator thread and is orders of mag-
                                                                    nitude faster than previous simulators for realistic indoor
Design overview. The above design requirements cut across
                                                                    environments (which typically operate at tens or hundreds of
several layers in the ‘software stack’ in Figure 1. A mono-
                                                                    frames per second) – see Table 1 for a summary and the sup-
lithic design is not suitable for addressing requirements at
                                                                    plement for more details. By comparison, AI2-THOR [17]
all levels. We, therefore, structure the Habitat platform to
                                                                    and CHALET [31] run at tens of fps, MINOS [24] and Gib-
mirror this multi-layer abstraction.
                                                                    son [30] run at about a hundred, and House3D [29] runs at
    At the lowest level is Habitat-Sim, a flexible, high-           about 300 fps. Habitat-Sim is 2-3 orders of magnitude
performance 3D simulator, responsible for loading 3D scenes         faster. By operating at 10,000 frames per second we shift
into a standardized scene-graph representation, configuring         the bottleneck from simulation to optimization for network
agents with multiple sensors, simulating agent motion, and          training. Based on TensorFlow benchmarks, many popular
returning sensory data from an agent’s sensor suite. The            network architectures run at frame rates that are 10-100x
sensor abstraction in Habitat allows additional sensors such        lower on a single GPU3 . In practice, we have observed that
as LIDAR and IMU to be easily implemented as plugins.               it is often faster to generate images using Habitat-Sim
Generic 3D dataset API using scene graphs.                          than to load images from disk.
Habitat-Sim employs a hierarchical scene graph                      Efficient GPU throughput. Currently, frames rendered
to represent all supported 3D environment datasets, whether         by Habitat-Sim are exposed as Python tensors through
synthetic or based on real-world reconstructions. The               shared memory. Future development will focus on even
use of a uniform scene graph representation allows us to            higher rendering efficiency by entirely avoiding GPU-to-
abstract the details of specific datasets, and to treat them in a   CPU memory copy overhead through the use of CUDA-GL
consistent fashion. Scene graphs allow us to compose 3D             interoperation and direct sharing of render buffers and tex-
environments through procedural scene generation, editing,          tures as tensors. Our preliminary internal testing suggests
or programmatic manipulation.                                       that this can lead to a speedup by a factor of 2.
Rendering engine. The Habitat-Sim backend module                        Above the simulation backend, the Habitat-API layer
is implemented in C++ and leverages the Magnum graphics             is a modular high-level library for end-to-end development
middleware library2 to support cross-platform deployment            in embodied AI. Setting up an embodied task involves speci-
on a broad variety of hardware configurations. The simu-            fying observations that may be used by the agent(s), using
lator backend employs an efficient rendering pipeline that          environment information provided by the simulator, and con-
implements visual sensor frame rendering using a multi-             necting the information with a task-specific episode dataset.
attachment ‘uber-shader’ combining outputs for color cam-           – Task:          this class extends the simulator’s
era sensors, depth sensors, and semantic mask sensors. By               Observations class and action space with task-
allowing all outputs to be produced in a single render pass,            specific ones. The criteria of episode termination and
we avoid additional overhead when sensor parameters are                 measures of success are provided by the Task. For
shared and the same render pass can be used for all outputs.            example, in goal-driven navigation, Task provides
Figure 2 shows examples of visual sensors rendered in three             the goal and evaluation metric [2]. To support this
different supported datasets. The same agent and sensor                 kind of functionality the Task has read-only access to
configuration was instantiated in a scene from each of the
                                                                      3 https://www.tensorflow.org/guide/performance/
   2 https://magnum.graphics/                                       benchmarks
   Simulator and Episode-Dataset.                                 continuous state space4 and motion can produce collisions
– Episode: a class for episode specification that includes        resulting in partial (or no) progress along the direction in-
   the initial position and orientation of an Agent, scene id,    tended – simply put, it is possible for the agent to ‘slide’
   goal position, and optionally the shortest path to the goal.   along a wall or obstacle. Crucially, the agent may choose
   An episode is a description of an instance of the task.        move_forward (0.25m) and end up in a location that is
– Environment: the fundamental environment concept                not 0.25m forward of where it started; thus, odometry is not
   for Habitat, abstracting all the information needed for        trivial even in the absence of actuation noise.
   working on embodied tasks with a simulator.                    Goal specification: static or dynamic? One conspicuous
   More details about the architecture of the Habitat plat-       underspecification in the PointGoal task [2] is whether the
form, performance measurements, and examples of API use           goal coordinates are static (i.e. provided once at the start of
are provided in the supplement.                                   the episode) or dynamic (i.e. provided at every time step).
                                                                  The former is more realistic – it is difficult to imagine a real
                                                                  task where an oracle would provide precise dynamic goal co-
4. PointGoal Navigation at Scale                                  ordinates. However, in the absence of actuation noise and col-
   To demonstrate the utility of the Habitat platform de-         lisions, every step taken by the agent results in a known turn
sign, we carry out experiments to test for generalization of      or translation, and this combined with the initial goal loca-
goal-directed visual navigation agents between datasets of        tion is functionally equivalent to dynamic goal specification.
different environments and to compare the performance of          We hypothesize that this is why recent works [16, 20, 13]
learning-based agents against classic agents as the amount        used dynamic goal specification. We follow and prescribe
of available training experience is increased.                    the following conceptual delineation – as a task, we adopt
                                                                  static PointGoal navigation; as for the sensor suite, we equip
Task definition. We use the PointGoal task (as defined by         our agents with an idealized GPS+Compass sensor. This ori-
Anderson et al. [2]) as our experimental testbed. This task is    ents us towards a realistic task (static PointGoal navigation),
ostensibly simple to define – an agent is initialized at a ran-   disentangles simulator design (actuation noise, collision dy-
dom starting position and orientation in an environment and       namics) from the task definition, and allows us to compare
asked to navigate to target coordinates that are provided rela-   techniques by sensors used (RGB, depth, GPS, compass,
tive to the agent’s position; no ground-truth map is available    contact sensors).
and the agent must only use its sensory input to navigate.
However, in the course of experiments, we realized that           Sensory input. The agents are endowed with a single color
this task leaves space for subtle choices that (a) can make a     vision sensor placed at a height of 1.5m from the center of
significant difference in experimental outcomes and (b) are       the agent’s base and oriented to face ‘forward’. This sensor
either not specified or inconsistent across papers, making        provides RGB frames at a resolution of 2562 pixels and with
comparison difficult. We attempt to be as descriptive as pos-     a field of view of 90 degrees. In addition, an idealized depth
sible about these seemingly low-level choices; we hope the        sensor is available, in the same position and orientation as
Habitat platform will help iron out these inconsistencies.        the color vision sensor. The field of view and resolution
                                                                  of the depth sensor match those of the color vision sensor.
Agent embodiment and action space. The agent is physi-            We designate agents that make use of the color sensor by
cally embodied as a cylindrical primitive shape with diame-       RGB, agents that make use of the depth sensor by Depth,
ter 0.2m and height 1.5m. The action space consists of four       and agents that make use of both by RGBD. Agents that
actions: turn_left, turn_right, move_forward,                     use neither sensor are denoted as Blind. All agents are
and stop. These actions are mapped to idealized actua-            equipped with an idealized GPS and compass – i.e., they
tions that result in 10 degree turns for the turning actions      have access to their location coordinates, and implicitly their
and linear displacement of 0.25m for the move_forward             orientation relative to the goal position.
action. The stop action allows the agent to signal that it
                                                                  Episode specification. We initialize the agent at a start-
has reached the goal. Habitat supports noisy actuations but
                                                                  ing position and orientation that are sampled uniformly at
experiments in this paper are conducted in the noise-free
                                                                  random from all navigable positions on the floor of the envi-
setting as our analysis focuses on other factors.
                                                                  ronment. The goal position is chosen such that it lies on the
Collision dynamics. Some previous works [3] use a coarse          same floor and there exists a navigable path from the agent’s
irregular navigation graph where an agent effectively ‘tele-      starting position. During the episode, the agent is allowed to
ports’ from one location to another (1-2m apart). Others [9]      take up to 500 actions. This threshold significantly exceeds
use a fine-grained regular grid (0.01m resolution) where the      the number of steps an optimal agent requires to reach all
agent moves on unoccupied cells and there are no collisions       goals (see the supplement). After each action, the agent
or partial steps. In Habitat and our experiments, we use
a more realistic collision model – the agent navigates in a          4 Up to machine precision.
receives a set of observations from the active sensors.                difference of static goal and dynamic GPS coordinates).
Evaluation. A navigation episode is considered successful            – Forward only always calls the move_forward action,
if and only if the agent issues a stop action within 0.2m of           and calls the stop action when within 0.2m of the goal.
the target coordinates, as measured by a geodesic distance           – Goal follower moves towards the goal direction. If it is
along the shortest path from the agent’s position to the goal          not facing the goal (more than 15 degrees off-axis), it
position. If the agent takes 500 actions without the above             performs turn_left or turn_right to align itself;
condition being met the episode ends and is considered un-             otherwise, it calls move_forward. The agent calls the
successful. Performance is measured using the ‘Success                 stop action when within 0.2m of the goal.
weighted by Path Length’ (SPL) metric [2]. For an episode            – RL (PPO) is an agent trained with reinforcement learn-
where the geodesic distance of the shortest path is l and the          ing, specifically proximal policy optimization [25]. We
agent traverses a distance p, SPL is defined as S · l/max(p,l),        experiment with RL agents equipped with different visual
where S is a binary indicator of success.                              sensors: no visual input (Blind), RGB input, Depth
Episode dataset preparation. We create PointGoal naviga-               input, and RGB with depth (RGBD). The model consists
tion episode-datasets for Matterport3D [8] and Gibson [30]             of a CNN that produces an embedding for visual input,
scenes. For Matterport3D we followed the publicly available            which together with the relative goal vector is used by an
train/val/test splits. Note that as in recent works [9, 20, 16],       actor (GRU) and a critic (linear layer). The CNN has the
there is no overlap between train, val, and test scenes. For           following architecture: {Conv 8×8, ReLU, Conv 4×4,
Gibson scenes, we obtained textured 3D surface meshes from             ReLU, Conv 3×3, ReLU, Linear, ReLU} (see supplement
the Gibson authors [30], manually annotated each scene on              for details). Let rt denote the reward at timestep t, dt be
its reconstruction quality (small/big holes, floating/irregular        the geodesic distance to goal at timestep t, s a success
surfaces, poor textures), and curated a subset of 106 scenes           reward and λ a time penalty (to encourage efficiency). All
(out of 572); see the supplement for details. An episode is de-        models were trained with the following reward function:
fined by the unique id of the scene, the starting position and                      (
orientation of the agent, and the goal position. Additional                             s + dt−1 − dt + λ   if goal is reached
                                                                             rt =
metadata such as the geodesic distance along the shortest                               dt−1 − dt + λ       otherwise
path (GDSP) from start position to goal position is also in-
cluded. While generating episodes, we restrict the GDSP                In our experiments s is set to 10 and λ is set to −0.01.
to be between 1m and 30m. An episode is trivial if there               Note that rewards are only provided in training environ-
is an obstacle-free straight line between the start and goal           ments; the task is challenging as the agent must generalize
positions. A good measure of the navigation complexity                 to unseen test environments.
of an episode is the ratio of GDSP to Euclidean distance             – SLAM [20] is an agent implementing a classic robotics
between start and goal positions (notice that GDSP can only            navigation pipeline (including components for localiza-
be larger than or equal to the Euclidean distance). If the             tion, mapping, and planning), using RGB and depth sen-
ratio is nearly 1, there are few obstacles and the episode is          sors. We use the classic agent by Mishkin et al. [20] which
easy; if the ratio is much larger than 1, the episode is difficult     leverages the ORB-SLAM2 [21] localization pipeline,
because strategic navigation is required. To keep the navi-            with the same parameters as reported in the original work.
gation complexity of the precomputed episodes reasonably
high, we perform rejection sampling for episodes with the            Training procedure. When training learning-based agents,
above ratio falling in the range [1, 1.1]. Following this, there     we first divide the scenes in the training set equally among
is a significant decrease in the number of near-straight-line        8 (Gibson), 6 (Matterport3D) concurrently running simula-
episodes (episodes with a ratio in [1, 1.1]) – from 37% to           tor worker threads. Each thread establishes blocks of 500
10% for the Gibson dataset generation. This step was not             training episodes for each scene in its training set partition
performed in any previous studies. We find that without this         and shuffles the ordering of these blocks. Training continues
filtering, all metrics appear inflated. Gibson scenes have           through shuffled copies of this array. We do not hardcode the
smaller physical dimensions compared to the Matterport3D             stop action to retain generality and allow for comparison
scenes. This is reflected in the resulting PointGoal dataset –       with future work that does not assume GPS inputs. For the
average GDSP of episodes in Gibson scenes is smaller than            experiments reported here, we train until 75 million agent
that of Matterport3D scenes.                                         steps are accumulated across all worker threads. This is
Baselines. We compare the following baselines:                       15x larger than the experience used in previous investiga-
– Random chooses an action randomly among                            tions [20, 16]. Training agents to 75 million steps took (in
    turn_left, turn_right, and move_forward                          sum over all three datasets): 320 GPU-hours for Blind,
    with uniform distribution. The agent calls the stop              566 GPU-hours for RGB, 475 GPU-hours for Depth, and
    action when within 0.2m of the goal (computed using the          906 GPU-hours for RGBD (overall 2267 GPU-hours).
  1.0                   Performance on Gibson validation split                      1.0                Performance on Matterport3D validation split
                                                                                                                                                            RGB
                                                                                                                                                            Depth
  0.8                                                                               0.8                                                                     RGBD
                                                                                                                                                            Blind
                                                                                                                                                            SLAM
  0.6                                                                               0.6
SPL                                                                               SPL
  0.4                                                                               0.4
                                                                          RGB
                                                                          Depth
  0.2                                                                     RGBD      0.2
                                                                          Blind
                                                                          SLAM
      0     10        20          30         40        50        60        70           0     10        20          30         40        50        60        70
                 Number of training steps taken (experience) in million                            Number of training steps taken (experience) in million

Figure 3: Average SPL of agents on the val set over the course of training. Previous work [20, 16] has analyzed performance at 5-10
million steps. Interesting trends emerge with more experience: i) Blind agents initially outperform RGB and RGBD but saturate quickly;
ii) Learning-based Depth agents outperform classic SLAM. The shaded areas around curves show the standard error of SPL over five seeds.


                                             Gibson                MP3D            Matterport3D). All RL (PPO) agents start out with far worse
                                                                                   SPL, but RL (PPO) Depth, in particular, improves dra-
Sensors      Baseline                    SPL        Succ         SPL      Succ
                                                                                   matically and matches the classic baseline at approximately
             Random                      0.02       0.03         0.01     0.01     10M frames (Gibson) or 30M frames (Matterport3D) of ex-
             Forward only                0.00       0.00         0.00     0.00     perience, continuing to improve thereafter. Notice that if
Blind
             Goal follower               0.23       0.23         0.12     0.12     we terminated the experiment at 5M frames as in [20] we
             RL (PPO)                    0.42       0.62         0.25     0.35     would also conclude that SLAM [20] dominates. Interest-
RGB          RL (PPO)                    0.46       0.64         0.30     0.42     ingly, RGB agents do not significantly outperform Blind
                                                                                   agents; we hypothesize because both are equipped with GPS
Depth        RL (PPO)                    0.79       0.89         0.54     0.69     sensors. Indeed, qualitative results (Figure 4 and video in
             RL (PPO)                    0.70       0.80         0.42     0.53     supplement) suggest that Blind agents ‘hug’ walls and
RGBD                                                                               implement ‘wall following’ heuristics. In contrast, RGB sen-
             SLAM [20]                   0.51       0.62         0.39     0.47
                                                                                   sors provide a high-dimensional complex signal that may be
Table 2: Performance of baseline methods on the PointGoal task [2]                 prone to overfitting to train environments due to the variety
tested on the Gibson [30] and MP3D [8] test sets under multiple                    across scenes (even within the same dataset). We also notice
sensor configurations. RL models have been trained for 75 million                  in Figure 3 that all methods perform better on Gibson than
steps. We report average rate of episode success and SPL [2].                      Matterport3D. This is consistent with our previous analysis
                                                                                   that Gibson contains smaller scenes and shorter episodes.

5. Results and Findings                                                               Next, for each agent and dataset, we select the best-
                                                                                   performing checkpoint on validation and report results on
    We seek to answer two questions: i) how do learning-                           test in Table 2. We observe that uniformly across the datasets,
based agents compare to classic SLAM and hand-coded                                RL (PPO) Depth performs best, outperforming RL (PPO)
baselines as the amount of training experience increases and                       RGBD (by 0.09-0.16 SPL), SLAM (by 0.15-0.28 SPL), and
ii) how well do learned agents generalize across 3D datasets.                      RGB (by 0.13-0.33 SPL) in that order (see the supplement for
    It should be tacitly understood, but to be explicit – ‘learn-                  additional experiments involving noisy depth). We believe
ing’ and ‘SLAM’ are broad families of techniques (and not                          Depth performs better than RGBD because i) the PointGoal
a single method), are not necessarily mutually exclusive,                          navigation task requires reasoning only about free space and
and are not ‘settled’ in their development. We compare rep-                        depth provides relevant information directly, and ii) RGB
resentative instances of these families to gain insight into                       has significantly more entropy (different houses look very
questions of scaling and generalization, and do not make any                       different), thus it is easier to overfit when using RGB. We ran
claims about intrinsic superiority of one or the other.                            our experiments with 5 random seeds per run, to confirm that
Learning vs SLAM. To answer the first question we plot                             these differences are statistically significant. The differences
agent performance (SPL) on validation (i.e. unseen) episodes                       are about an order of magnitude larger than the standard devi-
over the course of training in Figure 3 (top: Gibson, bottom:                      ation of average SPL for all cases (e.g. on the Gibson dataset
Matterport3D). SLAM [20] does not require training and                             errors are, Depth: ±0.015, RGB: ±0.055, RGBD: ±0.028,
thus has a constant performance (0.59 on Gibson, 0.42 on                           Blind: ±0.005). Random and forward-only agents have
                  Gibson                                   MP3D
  Blind SPL=0.28           RGB SPL=0.57   Blind SPL=0.35           RGB SPL=0.88    performance degradation, while the Blind agent is least
                                                                                   affected (as we would expect).
                                                                                      Second, we find a potentially counter-intuitive trend –
                                                                                   agents trained on Gibson consistently outperform their coun-
                                                                                   terparts trained on Matterport3D, even when evaluated on
  RGBD SPL=0.91        Depth SPL=0.98     RGBD SPL=0.90           Depth SPL=0.94   Matterport3D. We believe the reason is the previously noted
                                                                                   observation that Gibson scenes are smaller and episodes are
                                                                                   shorter (lower GDSP) than Matterport3D. Gibson agents are
                                                                                   trained on ‘easier’ episodes and encounter positive reward
                                                                                   more easily during random exploration, thus bootstrapping
Figure 4: Navigation examples for different sensory configurations                 learning. Consequently, for a fixed computation budget Gib-
of the RL (PPO) agent, visualizing trials from the Gibson and                      son agents are stronger universally (not just on Gibson). This
MP3D val sets. A blue dot and red dot indicate the starting and                    finding suggests that visual navigation agents could benefit
goal positions, and the blue arrow indicates final agent position.                 from curriculum learning.
The blue-green-red line is the agent’s trajectory. Color shifts from                  These insights are enabled by the engineering of Habitat,
blue to red as the maximum number of agent steps is approached.                    which made these experiments as simple as a change in the
See the supplemental materials for more example trajectories.                      evaluation dataset name.

                                 Gibson                       MP3D                 6. Habitat Challenge
Blind Gibson                      0.42                        0.34
      MP3D                        0.28                        0.25
                                                                                   No battle plan ever survives contact with the enemy.
RGB Gibson                        0.46                        0.40
      MP3D                        0.25                        0.30                                 Helmuth Karl Bernhard von Moltke
Depth Gibson                      0.79                        0.68
      MP3D                        0.56                        0.54
                                                                                       Challenges drive progress. The history of AI sub-fields
RGBD Gibson                       0.70                        0.53
      MP3D                        0.44                        0.42
                                                                                   indicates that the formulation of the right questions, the
                                                                                   creation of the right datasets, and the coalescence of commu-
Figure 5: Generalization of agents between datasets. We report                     nities around the right challenges drives scientific progress.
average SPL for a model trained on the source dataset in each row,                 Our goal is to support this process for embodied AI. Habitat
as evaluated on test episodes for the target dataset in each column.               Challenge is an autonomous navigation challenge that aims
                                                                                   to benchmark and advance efforts in goal-directed visual
                                                                                   navigation.
very low performance, while the hand-coded goal follower                               One difficulty in creating a challenge around embodied AI
and Blind baseline see modest performance.See the sup-                             tasks is the transition from static predictions (as in passive
plement for additional analysis of trained agent behavior.                         perception) to sequential decision making (as in sensori-
   In Figure 4 we plot example trajectories for the RL (PPO)                       motor control). In traditional ‘internet AI’ challenges (e.g.
agents, to qualitatively contrast their behavior in the same                       ImageNet [10], COCO [18], VQA [4]), it is possible to re-
episode. Consistent with the aggregate statistics, we observe                      lease a static testing dataset and ask participants to simply
that Blind collides with obstacles and follows walls, while                        upload their predictions on this set. In contrast, embodied AI
Depth is the most efficient. See the supplement and the                            tasks typically involve sequential decision making and agent-
video for more example trajectories.                                               driven control, making it infeasible to pre-package a testing
Generalization across datasets. Our findings so far are                            dataset. Essentially, embodied AI challenges require partici-
that RL (PPO) agents significantly outperform SLAM [20].                           pants to upload code not predictions. The uploaded agents
This prompts our second question – are these findings                              can then be evaluated in novel (unseen) test environments.
dataset specific or do learned agents generalize across                            Challenge infrastructure. We leverage the frontend and
datasets? We report exhaustive comparisons in Figure 5                             challenge submission process of the EvalAI platform, and
– specifically, average SPL for all combinations of {train,                        build backend infrastructure ourselves. Participants in Habi-
test} × {Matterport3D, Gibson} for all agents {Blind,                              tat Challenge are asked to upload Docker containers [19]
RGB, RGBD, Depth }. Rows indicate (agent, train set) pair,                         with their agents via EvalAI. The submitted agents are then
columns indicate test set. We find a number of interesting                         evaluated on a live AWS GPU-enabled instance. Specifically,
trends. First, nearly all agents suffer a drop in performance                      contestants are free to train their agents however they wish
when trained on one dataset and tested on another, e.g. RGBD                       (any language, any framework, any infrastructure). In or-
Gibson→Gibson 0.70 vs RGBD Gibson→Matterport3D 0.53                                der to evaluate these agents, participants are asked to derive
(drop of 0.17). RGB and RGBD agents suffer a significant                           from a base Habitat Docker container and implement a spe-
cific interface to their model – agent’s action taken given an    sensors generalize well between different 3D environment
observation from the environment at each step. This docker-       datasets in comparison to agents equipped with only RGB.
ized interface enables running the participant code on new        Feature roadmap. Our near-term development roadmap
environments.                                                     will focus on incorporating physics simulation and enabling
    More details regarding the Habitat Challenge held at          physics-based interaction between mobile agents and ob-
CVPR 2019 are available at the https://aihabitat.                 jects in 3D environments. Habitat-Sim’s scene graph
org/challenge/ website. In a future iteration of this             representation is well-suited for integration with physics en-
challenge we will introduce three major differences designed      gines, allowing us to directly control the state of individual
to both reduce the gap between simulation and reality and to      objects and agents within a scene graph. Another planned
increase the difficulty of the task.                              avenue of future work involves procedural generation of 3D
– In the 2019 challenge, the relative coordinates specifying      environments by leveraging a combination of 3D reconstruc-
   the goal were continuously updated during agent                tion and virtual object datasets. By combining high-quality
   movement – essentially simulating an agent with perfect        reconstructions of large indoor spaces with separately re-
   localization and heading estimation (e.g. an agent with        constructed or modelled objects, we can take full advantage
   an idealized GPS+Compass). However, high-precision             of our hierarchical scene graph representation to introduce
   localization in indoor environments can not be assumed in      controlled variation in the simulated 3D environments.
   realistic settings – GPS has low precision indoors, (visual)      Lastly, we plan to focus on distributed simulation settings
   odometry may be noisy, SLAM-based localization can             that involve large numbers of agents potentially interacting
   fail, etc. Hence, we will investiage only providing to the     with one another in competitive or collaborative scenarios.
   agent a fixed relative coordinate for the goal position
   from the start location.                                       Acknowledgments. We thank the reviewers for their help-
– Likewise, the 2019 Habitat Challenge modeled agent              ful suggestions. The Habitat project would not have been
  actions (e.g. forward, turn 10◦ left,...) deter-                possible without the support and contributions of many in-
  ministically. However in real settings, agent intention         dividuals. We are grateful to Mandeep Baines, Angel Xuan
  (e.g. go forward 1m) and the result rarely match perfectly      Chang, Alexander Clegg, Devendra Singh Chaplot, Xin-
  – actuation error, differing surface materials, and a myriad    lei Chen, Wojciech Galuba, Georgia Gkioxari, Daniel Gor-
  of other sources of error introduce significant drift over a    don, Leonidas Guibas, Saurabh Gupta, Jerry (Zhi-Yang) He,
  long trajectory. To model this, we introduce a noise model      Rishabh Jain, Or Litany, Joel Marcey, Dmytro Mishkin, Mar-
  acquired by benchmarking a real robotic platform [22].          cus Rohrbach, Amanpreet Singh, Yuandong Tian, Yuxin Wu,
  Visual sensing is an excellent means of combating this          Fei Xia, Deshraj Yadav, Amir Zamir, and Jiazhi Zhang for
  “dead-reckoning” drift and this change allows participants      their help.
  to study methodologies that are robust to and can correct
  for this noise.                                                 Licenses for referenced datasets.
                                                                  Gibson:            https://storage.googleapis.
– Finally, we will introduce realistic models of sensor noise     com/gibson_material/Agreement%20GDS%
   for RGB and depth sensors – narrowing the gap between          2006-04-18.pdf
   perceptual experiences agents would have in simulation         Matterport3D:     http://kaldir.vc.in.tum.de/
   and reality.                                                   matterport/MP_TOS.pdf.
    We look forward to supporting the community in estab-
lishing a benchmark to evaluate the state-of-the-art in meth-
ods for embodied navigation agents.

7. Future Work
    We described the design and implementation of the Habi-
tat platform. Our goal is to unify existing community efforts
and to accelerate research into embodied AI. This is a long-
term effort that will succeed only by full engagement of the
broader research community.
    Experiments enabled by the generic dataset support and
the high performance of the Habitat stack indicate that
i) learning-based agents can match and exceed the perfor-
mance of classic visual navigation methods when trained
for long enough and ii) learned agents equipped with depth
References                                                            [17] Eric Kolve, Roozbeh Mottaghi, Daniel Gordon, Yuke Zhu,
                                                                           Abhinav Gupta, and Ali Farhadi. AI2-THOR: An interactive
 [1] Phil Ammirato, Patrick Poirson, Eunbyung Park, Jana                   3D environment for visual AI. arXiv:1712.05474, 2017.
     Košecká, and Alexander C Berg. A dataset for developing
                                                                      [18] Tsung-Yi Lin, Michael Maire, Serge Belongie, James Hays,
     and benchmarking active vision. In ICRA, 2017.
                                                                           Pietro Perona, Deva Ramanan, Piotr Dollár, and C. Lawrence
 [2] Peter Anderson, Angel X. Chang, Devendra Singh Chaplot,
                                                                           Zitnick. Microsoft COCO: Common objects in context. In
     Alexey Dosovitskiy, Saurabh Gupta, Vladlen Koltun, Jana
                                                                           ECCV, 2014.
     Kosecka, Jitendra Malik, Roozbeh Mottaghi, Manolis Savva,
                                                                      [19] Dirk Merkel. Docker: Lightweight Linux containers for con-
     and Amir Roshan Zamir. On evaluation of embodied naviga-
                                                                           sistent development and deployment. Linux Journal, 2014.
     tion agents. arXiv:1807.06757, 2018.
 [3] Peter Anderson, Qi Wu, Damien Teney, Jake Bruce, Mark            [20] Dmytro Mishkin, Alexey Dosovitskiy, and Vladlen Koltun.
     Johnson, Niko Sünderhauf, Ian Reid, Stephen Gould, and                Benchmarking classic and learned navigation in complex 3D
     Anton van den Hengel. Vision-and-language navigation: In-             environments. arXiv:1901.10915, 2019.
     terpreting visually-grounded navigation instructions in real     [21] Raúl Mur-Artal and Juan D. Tardós. ORB-SLAM2: An
     environments. In CVPR, 2018.                                          open-source SLAM system for monocular, stereo and RGB-D
 [4] Stanislaw Antol, Aishwarya Agrawal, Jiasen Lu, Margaret               cameras. IEEE Transactions on Robotics, 33(5), 2017.
     Mitchell, Dhruv Batra, C. Lawrence Zitnick, and Devi Parikh.     [22] Adithyavairavan Murali, Tao Chen, Kalyan Vasudev Alwala,
     VQA: Visual Question Answering. In ICCV, 2015.                        Dhiraj Gandhi, Lerrel Pinto, Saurabh Gupta, and Abhinav
 [5] Iro Armeni, Ozan Sener, Amir R. Zamir, Helen Jiang, Ioannis           Gupta. Pyrobot: An open-source robotics framework for re-
     Brilakis, Martin Fischer, and Silvio Savarese. 3D semantic            search and benchmarking. arXiv preprint arXiv:1906.08236,
     parsing of large-scale indoor spaces. In CVPR, 2016.                  2019.
 [6] Alex Bewley, Jessica Rigley, Yuxuan Liu, Jeffrey Hawke,          [23] Xavier Puig, Kevin Ra, Marko Boben, Jiaman Li, Tingwu
     Richard Shen, Vinh-Dieu Lam, and Alex Kendall. Learning               Wang, Sanja Fidler, and Antonio Torralba. VirtualHome: Sim-
     to drive from simulation without real world labels. In ICRA,          ulating household activities via programs. In CVPR, 2018.
     2019.                                                            [24] Manolis Savva, Angel X. Chang, Alexey Dosovitskiy,
 [7] Simon Brodeur, Ethan Perez, Ankesh Anand, Florian Golemo,             Thomas Funkhouser, and Vladlen Koltun. MINOS: Mul-
     Luca Celotti, Florian Strub, Jean Rouat, Hugo Larochelle,             timodal indoor simulator for navigation in complex environ-
     and Aaron C. Courville. HoME: A household multimodal                  ments. arXiv:1712.03931, 2017.
     environment. arXiv:1711.11017, 2017.                             [25] John Schulman, Filip Wolski, Prafulla Dhariwal, Alec Rad-
 [8] Angel Chang, Angela Dai, Thomas Funkhouser, Maciej Hal-               ford, and Oleg Klimov. Proximal policy optimization algo-
     ber, Matthias Niessner, Manolis Savva, Shuran Song, Andy              rithms. arXiv:1707.06347, 2017.
     Zeng, and Yinda Zhang. Matterport3D: Learning from RGB-          [26] Linda Smith and Michael Gasser. The development of em-
     D data in indoor environments. In International Conference            bodied cognition: Six lessons from babies. Artificial Life,
     on 3D Vision (3DV), 2017.                                             11(1-2), 2005.
 [9] Abhishek Das, Samyak Datta, Georgia Gkioxari, Stefan Lee,        [27] Shuran Song, Fisher Yu, Andy Zeng, Angel X Chang, Mano-
     Devi Parikh, and Dhruv Batra. Embodied Question Answer-               lis Savva, and Thomas Funkhouser. Semantic scene comple-
     ing. In CVPR, 2018.                                                   tion from a single depth image. In CVPR, 2017.
[10] Jia Deng, Wei Dong, Richard Socher, Li-Jia Li, Kai Li, and       [28] Julian Straub, Thomas Whelan, Lingni Ma, Yufan Chen, Erik
     Fei-Fei Li. ImageNet: A large-scale hierarchical image                Wijmans, Simon Green, Jakob J. Engel, Raul Mur-Artal, Carl
     database. In CVPR, 2009.                                              Ren, Shobhit Verma, Anton Clarkson, Mingfei Yan, Brian
[11] Jacob Devlin, Ming-Wei Chang, Kenton Lee, and Kristina                Budge, Yajie Yan, Xiaqing Pan, June Yon, Yuyang Zou, Kim-
     Toutanova. BERT: Pre-training of deep bidirectional trans-            berly Leon, Nigel Carter, Jesus Briales, Tyler Gillingham,
     formers for language understanding. arXiv:1810.04805,                 Elias Mueggler, Luis Pesqueira, Manolis Savva, Dhruv Batra,
     2018.                                                                 Hauke M. Strasdat, Renzo De Nardi, Michael Goesele, Steven
[12] David Donoho. 50 years of data science. In Tukey Centennial           Lovegrove, and Richard Newcombe. The Replica dataset: A
     Workshop, 2015.                                                       digital replica of indoor spaces. arXiv:1906.05797, 2019.
[13] Saurabh Gupta, James Davidson, Sergey Levine, Rahul Suk-         [29] Yi Wu, Yuxin Wu, Georgia Gkioxari, and Yuandong Tian.
     thankar, and Jitendra Malik. Cognitive mapping and planning           Building generalizable agents with a realistic and rich 3D
     for visual navigation. In CVPR, 2017.                                 environment. arXiv:1801.02209, 2018.
[14] Kaiming He, Xiangyu Zhang, Shaoqing Ren, and Jian Sun.
                                                                      [30] Fei Xia, Amir R. Zamir, Zhiyang He, Alexander Sax, Jiten-
     Deep residual learning for image recognition. In CVPR, 2016.
                                                                           dra Malik, and Silvio Savarese. Gibson env: Real-world
[15] Jemin Hwangbo, Joonho Lee, Alexey Dosovitskiy, Dario
                                                                           perception for embodied agents. In CVPR, 2018.
     Bellicoso, Vassilios Tsounis, Vladlen Koltun, and Marco
                                                                      [31] Claudia Yan, Dipendra Misra, Andrew Bennnett, Aaron Wals-
     Hutter. Learning agile and dynamic motor skills for legged
                                                                           man, Yonatan Bisk, and Yoav Artzi. CHALET: Cornell house
     robots. Science Robotics, 2019.
                                                                           agent learning environment. arXiv:1801.07357, 2018.
[16] Noriyuki Kojima and Jia Deng. To learn or not to learn:
     Analyzing the role of learning for navigation in virtual envi-
     ronments. arXiv:1907.11770, 2019.
A. Habitat Platform Details                                         • Flexible, structured representation of 3D environments
                                                                       using SceneGraphs, allowing for programmatic ma-
   As described in the main paper, Habitat consists of the             nipulation of object state, and combination of objects
following components:                                                  from different environments.
   • Habitat-Sim: a flexible, high-performance 3D                   • High-efficiency rendering engine with multi-attachment
     simulator with configurable agents, multiple sensors,             render pass to reduce overhead for multiple sensors.
     and generic 3D dataset handling (with built-in sup-
                                                                    • Arbitrary numbers of Agents and corresponding
     port for Matterport3D [8], Gibson [30], and other
                                                                       Sensors that can be linked to a 3D environment by
     datasets). Habitat-Sim is fast – when rendering a                 attachment to a SceneGraph.
     realistic scanned scene from the Matterport3D dataset,      The performance of the simulation backend surpasses that
     Habitat-Sim achieves several thousand frames per            of prior work operating on realistic reconstruction datasets
     second (fps) running single-threaded, and can reach         by a large margin. Table 3 reports performance statistics on
     over 10,000 fps multi-process on a single GPU.
                                                                 a test scene from the Matterport3D dataset. Single-thread
   • Habitat-API: a modular high-level library for end-          performance reaches several thousand frames per second
     to-end development of embodied AI – defining embod-         (fps), while multi-process operation with several simulation
     ied AI tasks (e.g. navigation [2], instruction follow-      backends can reach over 10,000 fps on a single GPU. In
     ing [3], question answering [9]), configuring embodied      addition, by employing OpenGL-CUDA interoperation we
     agents (physical form, sensors, capabilities), training
                                                                 enable direct sharing of rendered image frames with ML
     these agents (via imitation or reinforcement learning,
                                                                 frameworks such as PyTorch without a measurable impact
     or via classic SLAM), and benchmarking their perfor-        on performance as the image resolution is increased (see
     mance on the defined tasks using standard metrics [2].      Figure 7).
     Habitat-API currently uses Habitat-Sim as the
     core simulator, but is designed with a modular abstrac-     Habitat-API. The second layer of the Habitat platform
     tion for the simulator backend to maintain compatibility    (Habitat-API) focuses on creating a general and flex-
     over multiple simulators.                                   ible API for defining embodied agents, tasks that they may
                                                                 carry out, and evaluation metrics for those tasks. When de-
Key abstractions. The Habitat platform relies on a num-          signing such an API, a key consideration is to allow for easy
ber of key abstractions that model the domain of embodied
                                                                 extensibility of the defined abstractions. This is particularly
agents and tasks that can be carried out in three-dimensional
                                                                 important since many of the parameters of embodied agent
indoor environments. Here we provide a brief summary of          tasks, specific agent configurations, and 3D environment
key abstractions:                                                setups can be varied in interesting ways. Future research is
   • Agent: a physically embodied agent with a suite of          likely to propose new tasks, new agent configurations, and
     Sensors. Can observe the environment and is capable         new 3D environments.
     of taking actions that change agent or environment state.
                                                                     The API allows for alternative simulator backends to
   • Sensor: associated with a specific Agent, capable
                                                                 be used, beyond the Habitat-Sim module that we imple-
     of returning observation data from the environment at a     mented. This modularity has the advantage of allowing incor-
     specified frequency.                                        poration of existing simulator backends to aid in transitioning
   • SceneGraph: a hierarchical representation of a 3D           from experiments that previous work has performed using
     environment that organizes the environment into re-         legacy frameworks. The architecture of Habitat-API is
     gions and objects which can be programmatically ma-
                                                                 illustrated in Figure 8, indicating core API functionality and
     nipulated.
                                                                 functionality implemented as extensions to the core.
   • Simulator: an instance of a simulator backend.                  Above the API level, we define a concrete embodied task
     Given actions for a set of configured Agents and            such as visual navigation. This involves defining a specific
     SceneGraphs, can update the state of the Agents             dataset configuration, specifying the structure of episodes
     and SceneGraphs, and provide observations for all           (e.g. number of steps taken, termination conditions), training
     active Sensors possessed by the Agents.
                                                                 curriculum (progression of episodes, difficulty ramp), and
   These abstractions connect the different layers of the
                                                                 evaluation procedure (e.g. test episode sets and task metrics).
platform. They also enable generic and portable specification    An example of loading a pre-configured task (PointNav) and
of embodied AI tasks.                                            stepping through the environment with a random agent is
Habitat-Sim. The architecture of the Habitat-Sim back-           shown in the code below.
end module is illustrated in Figure 6. The design of this           5 Note: The semantic sensor in Matterport3D requires using additional
module ensures a few key properties:                             3D meshes with significantly more geometric complexity, leading to re-
   • Memory-efficient management of 3D environment re-           duced performance. We expect this to be addressed in future versions,
     sources (triangle mesh geometry, textures, shaders) en-     leading to speeds comparable to RGB + depth.
     suring shared resources are cached and reused.
                   ResourceManager                                            Simulator                                   Agent


                                                                           SceneManager

         Texture                  Material           Shader
                                                                             SceneGraph


                         Mesh                                                SceneNode                                    Sensor

Figure 6: Architecture of Habitat-Sim main classes. The Simulator delegates management of all resources related to 3D environments
to a ResourceManager that is responsible for loading and caching 3D environment data from a variety of on-disk formats. These resources
are used within SceneGraphs at the level of individual SceneNodes that represent distinct objects or regions in a particular Scene. Agents
and their Sensors are instantiated by being attached to SceneNodes in a particular SceneGraph.


                                              GPU→CPU→GPU                         GPU→CPU                    GPU→GPU
       Sensors / number of processes             1         3        5         1         3          5        1         3            5
       RGB                                   2,346    6,049    7,784     3,919     8,810    11,598     4,538     8,573      7,279
       RGB + depth                           1,260    3,025    3,730     1,777     4,307     5,522     2,151     3,557      3,486
       RGB + depth + semantics5                378      463      470       396       465       466       464       455        453

Table 3: Performance of Habitat-Sim in frames per second for an example Matterport3D scene (id 17DRP5sb8fy) on a Xeon E5-2690
v4 CPU and Nvidia Titan Xp GPU, measured at a frame resolution of 128x128, under different frame memory transfer strategies and with a
varying number of concurrent simulator processes sharing the GPU. ‘GPU-CPU-GPU’ indicates passing of rendered frames from OpenGL
context to CPU host memory and back to GPU device memory for use in optimization, ‘GPU-CPU’ only reports copying from OpenGL
context to CPU host memory, whereas ‘GPU-GPU’ indicates direct sharing through OpenGL-CUDA interoperation.


                                                                        report the average geodesic distance along the shortest path
                                                                        (GDSP) between starting point and goal position. As noted
                                                                        in the main paper, Gibson episodes are significantly shorter
                                                                        than Matterport3D ones. Figure 9 visualizes the episode
                                                                        distributions over geodesic distance (GDSP), Euclidean dis-
                                                                        tance between start and goal position, and the ratio of the
                                                                        two (an approximate measure of complexity for the episode).
                                                                        We again note that Gibson episodes have more episodes with
                                                                        shorter distances, leading to the dataset being overall easier
                                                                        than the Matterport3D dataset.
                                                                        import habitat

                                                                        # Load embodied AI task (PointNav)
                                                                        # and a pre-specified virtual robot
                                                                        config = habitat.get_config(config_file=
                                                                                                    "pointnav.yaml")
Figure 7: Performance of Habitat-Sim under different sensor             env = habitat.Env(config)
frame memory transfer strategies for increasing image resolution.       observations = env.reset()
We see that ‘GPU->GPU’ is unaffected by image resolution while
other strategies degrade rapidly.                                       # Step through environment with random actions
                                                                        while not env.episode_over:
                                                                            observations = \
B. Additional Dataset Statistics                                                env.step(env.action_space.sample())

   In Table 5 we summarize the train, validation and test split
sizes for all three datasets used in our experiments. We also
                                                                  Sensor API
                                                                                        RL Environment          RL baselines
                           Habitat-Sim                          Simulator API
                                                                                                                    SLAM
                                                                                         Environment                 ...
                          Embodied QA
                                                                      Task                                        Imitation
                                                                                                                   learning
                              Navigation

                                                                  Episodes                                        Baselines
                                                                                           Episode
                                                                  Dataset




  Gibson PointNav               Matterport3D PointNav                     Replica PointNav           Matterport3D EQA           Replica EQA


                               use                    inherit                core API            extensions and implementations

Figure 8: Architecture of Habitat-API. The core functionality defines fundamental building blocks such as the API for interacting with
the simulator backend and receiving observations through Sensors. Concrete simulation backends, 3D datasets, and embodied agent
baselines are implemented as extensions to the core API.


Dataset          scenes (#)            episodes (#)          average GDSP (m)       C.1. Analysis of Collisions
Matterport3D    58 / 11 / 18         4.8M / 495 / 1008       11.5 / 11.1 / 13.2        To further characterize the behavior of learned agents
Gibson          72 / 16 / 10        4.9M / 1000 / 1000         6.9 / 6.5 / 7.0
                                                                                    during navigation we plot the average number of collisions
                                                                                    in Figure 10. We see that Blind incurs a much larger
Table 4: Statistics of the PointGoal navigation datasets that we                    number of collisions than other agents, providing evidence
precompute for the Matterport3D and Gibson datasets: total number
                                                                                    for ‘wall-following’ behavior. Depth-equipped agents have
of scenes, total number of episodes, and average geodesic distance
                                                                                    the lowest number of collisions, while RGB agents are in
between start and goal positions. Each cell reports train / val / test
split statistics.                                                                   between.

                                                                                    C.2. Noisy Depth
           Dataset             Min      Median        Mean      Max
           Matterport3D        18        90.0         97.1      281
                                                                                       To investigate the impact of noisy depth measurements on
           Gibson              15        60.0         63.3      207                 agent performance, we re-evaluated depth agents (without
                                                                                    re-training) on noisy depth generated using a simple noise
Table 5: Statistics of path length (in actions) for an oracle which                 model: iid Gaussian noise (µ = 0, σ = 0.4) at each pixel
greedily fits actions to follow the negative of geodesic distance                   in inverse depth (larger depth = more noise). We observe
gradient on the PointGoal navigation validation sets. This provides                 a drop of 0.13 and 0.02 SPL for depth-RL and SLAM on
expected horizon lengths for a near-perfect agent and contextualizes                Gibson-val (depth-RL still outperforms SLAM). Note that
the decision for a max-step limit of 500.                                           SLAM from [20] utilizes ORB-SLAM2, which is quite
                                                                                    robust to noise, while depth-RL was trained without noise.
C. Additional Experimental Results                                                  If we increase σ to 0.1, depth-RL gets 0.12 SPL whereas
                                                                                    SLAM suffers catastrophic failures.
   In order to confirm that the trends we observe for the
experimental results presented in the paper hold for much                           D. Gibson Dataset Curation
larger amounts of experience, we scaled our experiments to
800M steps. We found that (1) the ordering of the visual                               We manually curated the full dataset of Gibson 3D tex-
inputs stays Depth > RGBD > RGB > Blind; (2) RGB                                    tured meshes [30] to select meshes that do not exhibit signif-
is consistently better than Blind (by 0.06/0.03 SPL on                              icant reconstruction artifacts such as holes or texture quality
Gibson/Matterport3D), and (3) RGBD outperforms SLAM                                 issues. A key issue that we tried to avoid is the presence of
on Matterport3D (by 0.16 SPL).
Figure 9: Statistics of PointGoal navigation episodes. From left: distribution over Euclidean distance between start and goal, distribution
over geodesic distance along shortest path between start and goal, and distribution over the ratio of geodesic to Euclidean distance.


Gibson Blind                                                            habitat-api/habitat_baselines. Below is the
       RGB
       RGBD                                                             shell script we used for our RL experiments:
       Depth
MP3D Blind                                                              # Note: parameters in {} are experiment specific.
       RGB                                                              # Note: use 8, 6 processes for Gibson, MP3D
       RGBD                                                             #       respectively.
       Depth
                0    5    10    15 20 25 30             35    40        python habitat_baselines/train_ppo.py \
                                 Avg. Collisions                            --sensors {RGB_SENSOR,DEPTH_SENSOR} \
                                                                            --blind {0,1} --use-gae --lr 2.5e-4 \
Figure 10: Average number of collisions during successful navi-             --clip-param 0.1 --use-linear-lr-decay \
gation episodes for the different sensory configurations of the RL          --num-processes {8,6} --num-steps 128 \
(PPO) baseline agent on test set episodes for the Gibson and Matter-        --num-mini-batch 4 --num-updates 135000 \
                                                                            --use-linear-clip-decay \
port3D datasets. The Blind agent experiences the highest number
of collisions, while agents possessing depth sensors (Depth and
                                                                           For running SLAM please                  refer    to   habitat-
RGBD) have the fewest collisions on average.
                                                                        api/habitat_baselines/slambased.
holes or cracks in floor surfaces. This is particularly problem-
atic for navigation tasks as it divides seemingly connected             F. Example Navigation Episodes
navigable areas into non-traversable disconnected compo-                   Figure 12 visualizes additional example navigation
nents. We manually annotated the scenes (using the 0 to 5               episodes for the different sensory configurations of the RL
quality scale shown in Figure 11) and only use scenes with a            (PPO) agents that we describe in the main paper. Blind
rating of 4 or higher, i.e., no holes, good reconstruction, and         agents have the lowest performance, colliding much more
negligible texture issues to generate the dataset episodes.             frequently with the environment and adopting a ‘wall hug-
                                                                        ging’ strategy for navigation. RGB agents are less prone
E. Reproducing Experimental Results                                     to collisions but still struggle to navigate to the goal posi-
   Our experimental results can be reproduced us-                       tion successfully in some cases. In contrast, depth-equipped
ing the Habitat-API (commit ec9557a) and                                agents are much more efficient, exhibiting fewer collisions,
Habitat-Sim (commit d383c20) repositories. The                          and navigating to goals more successfully (as indicated by
code for running experiments is present under the folder                the overall higher SPL values).
      0: critical reconstruction artifacts, holes, or texture issues    1: big holes or significant texture issues and reconstruction artifacts




  2: big holes or significant texture issues, but good reconstruction         3: small holes, some texture issues, good reconstruction




        4: no holes, some texture issues, good reconstruction                    5: no holes, uniform textures, good reconstruction

Figure 11: Rating scale used in curation of 3D textured mesh reconstructions from the Gibson dataset. We use only meshes with ratings of 4
or higher for the Habitat Challenge dataset.
                                                                Gibson




                       Blind SPL = 0.00                                                        RGB SPL = 0.45




                        RGBD SPL = 0.82                                                      Depth SPL = 0.88




                       Blind SPL = 0.00                                                        RGB SPL = 0.29




                        RGBD SPL = 0.49                                                    Depth SPL = 0.96

Figure 12: Additional navigation example episodes for the different sensory configurations of the RL (PPO) agent, visualizing trials from
the Gibson and MP3D val sets. A blue dot and red dot indicate the starting and goal positions, and the blue arrow indicates final agent
position. The blue-green-red line is the agent’s trajectory. Color shifts from blue to red as the maximum number of allowed agent steps is
approached.
                                                                MP3D




                       Blind SPL = 0.00                                                        RGB SPL = 0.40




                        RGBD SPL = 0.92                                                    Depth SPL = 0.98

Figure 12: Additional navigation example episodes for the different sensory configurations of the RL (PPO) agent, visualizing trials from
the Gibson and MP3D val sets. A blue dot and red dot indicate the starting and goal positions, and the blue arrow indicates final agent
position. The blue-green-red line is the agent’s trajectory. Color shifts from blue to red as the maximum number of allowed agent steps is
approached.
